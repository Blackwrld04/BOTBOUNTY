import { createPublicClient, http, parseAbi, decodeEventLog, formatEther } from 'viem';
import { config } from '../config.js';
import { db } from '../db.js';

// ABI for BotBountyEscrow events and release method
export const ESCROW_ABI = parseAbi([
  'event BountyCreated(bytes32 indexed bountyId, address indexed maintainer, address settlementToken, uint256 amount, string issueUrl, uint256 deadline, uint256 reviewPeriod)',
  'event SolutionSubmitted(bytes32 indexed bountyId, address indexed solver, string prUrl, uint256 submittedAt)',
  'event SolutionCommitted(bytes32 indexed bountyId, address indexed solver, bytes32 indexed solutionCommitment, uint256 submittedAt)',
  'event SolutionRejected(bytes32 indexed bountyId, address indexed solver, string reason)',
  'event BountySettled(bytes32 indexed bountyId, address indexed solver, address settlementToken, uint256 amount, string prUrl, bool timedOut)',
  'event BountyRefunded(bytes32 indexed bountyId, address indexed maintainer, address settlementToken, uint256 amount)',
  'function releaseBounty(bytes32 bountyId) external',
  'function releaseBountyWithProof(bytes32 bountyId, string calldata prUrl, bytes32 salt) external'
]);

export function getPublicClient(rpcUrl) {
  return createPublicClient({
    transport: http(rpcUrl || config.botRpcUrl || 'https://rpc.botchain.ai')
  });
}

const KNOWN_ESCROW_CONTRACTS = new Set([
  (config.escrowContractAddress || '0x909661b453bBe13Ee247551754b35370557A9aA2').toLowerCase(),
  (config.testnetEscrowContractAddress || '0xB128F2f442554B6517D779788F28F2EB2612164A').toLowerCase(),
  '0x909661b453bbe13ee247551754b35370557a9aa2',
  '0xb128f2f442554b6517d779788f28f2eb2612164a'
]);

async function fetchReceiptAcrossBotChains(txHash) {
  const urls = Array.from(new Set([
    config.botRpcUrl || 'https://rpc.botchain.ai',
    config.botMainnetRpcUrl || 'https://rpc.botchain.ai',
    config.botTestnetRpcUrl || 'https://rpc.bohr.life'
  ]));
  for (const url of urls) {
    try {
      const client = getPublicClient(url);
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      if (receipt) return receipt;
    } catch (_) {
      // try next RPC
    }
  }
  return null;
}

function chainBypassEnabled() {
  // Test-only escape hatch. It must be explicitly enabled in addition to
  // NODE_ENV=test so a misconfigured production process cannot silently skip
  // on-chain verification.
  return process.env.NODE_ENV === 'test' && process.env.ALLOW_UNVERIFIED_CHAIN_TXS === 'true';
}

function expectedBountyIdForTest(txHash) {
  // Derive a stable unique 32-byte identifier from the transaction hash so
  // multiple simulated bounties do not collide.
  return `0x${txHash.slice(2).padEnd(64, '0').slice(0, 64)}`;
}

/**
 * Convert a decimal token amount to integer base units without floating-point
 * rounding. Accepts bigint, integer, or decimal string/number input.
 */
export function toBaseUnits(value, decimals) {
  if (typeof value === 'bigint') return value;

  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) {
    throw new Error(`Invalid token amount: "${value}".`);
  }

  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > decimals && /[1-9]/.test(fraction.slice(decimals))) {
    throw new Error(`Token amount "${value}" has more than ${decimals} decimal places.`);
  }

  const paddedFraction = (fraction.slice(0, decimals) + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * (10n ** BigInt(decimals)) + BigInt(paddedFraction || '0');
}

/**
 * Validate 66-character hex format (0x + 64 hex chars)
 */
export function isValidTxHashFormat(hash) {
  return typeof hash === 'string' && /^0x[0-9a-fA-F]{64}$/.test(hash);
}

/**
 * Check if a deposit transaction hash has already been used in the database
 */
export function isDepositTxReused(txHash) {
  const row = db.prepare(`SELECT id, title FROM bounties WHERE LOWER(deposit_tx) = LOWER(?) LIMIT 1`).get(txHash);
  return !!row;
}

/**
 * Check if a settlement transaction hash has already been used in the database
 */
export function isSettlementTxReused(txHash) {
  const row = db.prepare(`SELECT id FROM disbursements WHERE LOWER(tx_hash) = LOWER(?) LIMIT 1`).get(txHash);
  if (row) return true;
  const bountyRow = db.prepare(`SELECT id FROM bounties WHERE LOWER(settlement_tx) = LOWER(?) LIMIT 1`).get(txHash);
  return !!bountyRow;
}

/**
 * Verify an on-chain deposit transaction on Bohr Testnet.
 * Matches:
 * 1. Valid tx hash format
 * 2. Not already used in DB
 * 3. Mined and succeeded on Bohr
 * 4. Interacted with active Escrow contract
 * 5. Emitted BountyCreated event with matching settlement token (Native $BOT address(0)) and amount
 */
export async function verifyDepositTransaction({
  txHash,
  expectedAmount,
  expectedToken = '0x0000000000000000000000000000000000000000',
  expectedMaintainer
}) {
  if (!isValidTxHashFormat(txHash)) {
    throw new Error(`Invalid transaction hash format: "${txHash}". Expected 66-character hex.`);
  }

  if (isDepositTxReused(txHash)) {
    throw new Error(`Transaction hash ${txHash} has already been used to fund another bounty.`);
  }

  if (chainBypassEnabled()) {
    return {
      verified: true,
      simulated: true,
      txHash,
      bountyId: expectedBountyIdForTest(txHash),
      maintainer: expectedMaintainer || null,
      settlementToken: expectedToken,
      amountWei: expectedAmount !== undefined ? toBaseUnits(expectedAmount, 18).toString() : '0'
    };
  }

  const receipt = await fetchReceiptAcrossBotChains(txHash);

  if (!receipt) {
    throw new Error(`Transaction ${txHash} not found on BOT Chain Mainnet or Bohr Testnet. Fabricated transactions are rejected.`);
  }

  if (receipt.status !== 'success') {
    throw new Error(`Transaction ${txHash} failed or reverted on BOT Chain.`);
  }

  const targetTo = (receipt.to || '').toLowerCase();
  if (!KNOWN_ESCROW_CONTRACTS.has(targetTo)) {
    throw new Error(`Transaction was sent to ${receipt.to}, but active BOT Chain Escrow contract is ${config.escrowContractAddress}.`);
  }

  // Parse BountyCreated event
  let createdEvent = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== targetTo) continue;
    try {
      const decoded = decodeEventLog({
        abi: ESCROW_ABI,
        data: log.data,
        topics: log.topics
      });
      if (decoded.eventName === 'BountyCreated') {
        createdEvent = decoded;
        break;
      }
    } catch (e) {
      // ignore other events
    }
  }

  if (!createdEvent) {
    throw new Error(`Transaction did not emit BountyCreated event on Bohr Escrow contract.`);
  }

  const { bountyId, maintainer, settlementToken, amount } = createdEvent.args;

  // Verify settlement token matches expected token (Native $BOT address(0) or Bridged USDT)
  if (expectedToken && settlementToken.toLowerCase() !== expectedToken.toLowerCase()) {
    throw new Error(`Settlement token ${settlementToken} does not match expected token (${expectedToken}).`);
  }

  // The funding wallet must be the same account that is creating the bounty.
  if (expectedMaintainer && maintainer.toLowerCase() !== expectedMaintainer.toLowerCase()) {
    throw new Error(`On-chain maintainer ${maintainer} does not match the authenticated wallet (${expectedMaintainer}).`);
  }

  // Check amount matches if expectedAmount is provided
  if (expectedAmount !== undefined && expectedAmount !== null) {
    const decimals = tokenDecimals(settlementToken);
    const expectedAmountWei = toBaseUnits(expectedAmount, decimals);
    if (expectedAmountWei <= 0n) {
      throw new Error('Expected bounty amount must be greater than zero.');
    }
    // Deposits may overfund a bounty, but never underfund it.
    if (amount < expectedAmountWei) {
      throw new Error(`On-chain funded amount (${amount.toString()}) is less than required bounty amount (${expectedAmountWei.toString()}).`);
    }
  }

  return {
    verified: true,
    txHash,
    bountyId,
    maintainer,
    settlementToken,
    amountWei: amount.toString(),
    blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined
  };
}

/**
 * Verify an on-chain settlement / release transaction on Bohr Testnet.
 * Matches:
 * 1. Valid tx hash format
 * 2. Not already used in DB
 * 3. Mined and succeeded on Bohr
 * 4. Emitted BountySettled event with matching solver address and amount
 */
export async function verifySettlementTransaction({
  txHash,
  expectedSolver,
  expectedAmount,
  expectedBountyId,
  receipt: injectedReceipt,
  contractAddress: customContractAddress
}) {
  if (!isValidTxHashFormat(txHash)) {
    throw new Error(`Invalid transaction hash format: "${txHash}". Expected 66-character hex.`);
  }

  if (isSettlementTxReused(txHash)) {
    throw new Error(`Settlement transaction hash ${txHash} has already been recorded in platform disbursements.`);
  }

  let receipt = injectedReceipt;

  if (!receipt) {
    if (chainBypassEnabled()) {
      const simulatedDecimals = 18;
      return {
        verified: true,
        simulated: true,
        txHash,
        bountyId: expectedBountyId,
        solver: expectedSolver,
        settlementToken: '0x0000000000000000000000000000000000000000',
        amountWei: expectedAmount !== undefined
          ? toBaseUnits(expectedAmount, simulatedDecimals).toString()
          : '0'
      };
    }

    receipt = await fetchReceiptAcrossBotChains(txHash);
    if (!receipt) {
      throw new Error(`Settlement transaction ${txHash} not found on BOT Chain Bohr Testnet. Fabricated hashes are rejected.`);
    }
  }

  if (!receipt) {
    throw new Error(`Settlement transaction ${txHash} not found on BOT Chain Bohr Testnet. Fabricated hashes are rejected.`);
  }

  if (receipt.status !== 'success') {
    throw new Error(`Settlement transaction ${txHash} failed or reverted on BOT Chain Bohr Testnet.`);
  }

  const targetTo = (receipt.to || '').toLowerCase();
  if (customContractAddress) {
    const expectedContract = customContractAddress.toLowerCase();
    if (targetTo !== expectedContract) {
      throw new Error(`Settlement transaction was sent to ${receipt.to}, but active Bohr Escrow contract is ${expectedContract}.`);
    }
  } else if (!KNOWN_ESCROW_CONTRACTS.has(targetTo)) {
    throw new Error(`Settlement transaction was sent to ${receipt.to}, but active BOT Chain Escrow contract is ${config.escrowContractAddress}.`);
  }

  // Find BountySettled event
  let settledEvent = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== targetTo) continue;
    try {
      const decoded = decodeEventLog({
        abi: ESCROW_ABI,
        data: log.data,
        topics: log.topics
      });
      if (decoded.eventName === 'BountySettled') {
        settledEvent = decoded;
        break;
      }
    } catch (e) {
      // ignore other events
    }
  }

  if (!settledEvent) {
    throw new Error(`Transaction did not emit BountySettled event on Bohr Escrow contract.`);
  }

  const { bountyId, solver, amount, settlementToken, prUrl, timedOut } = settledEvent.args;

  // Timeout auto-claims are a legitimate contract path: the escrow enforces the
  // review deadline and pays the assigned solver. The server records the event
  // exactly as emitted instead of refusing to recognize a real on-chain payout.

  // Verify recipient solver matches
  if (expectedSolver && solver.toLowerCase() !== expectedSolver.toLowerCase()) {
    throw new Error(`On-chain recipient ${solver} does not match the winning solver's wallet address (${expectedSolver}).`);
  }

  // Verify bounty ID (mandatory: a settlement for a different bounty must never be accepted)
  if (!expectedBountyId || bountyId.toLowerCase() !== expectedBountyId.toLowerCase()) {
    throw new Error(`On-chain settlement bountyId (${bountyId}) does not match this bounty.`);
  }

  // The recorded reward must match the on-chain settlement exactly.
  if (expectedAmount !== undefined && expectedAmount !== null) {
    const decimals = tokenDecimals(settlementToken);
    const expectedAmountWei = toBaseUnits(expectedAmount, decimals);
    if (expectedAmountWei <= 0n) {
      throw new Error('Expected settlement amount must be greater than zero.');
    }
    if (amount !== expectedAmountWei) {
      throw new Error(`On-chain settled amount (${amount.toString()} base units) does not match expected reward amount (${expectedAmountWei.toString()} base units).`);
    }
  }

  return {
    verified: true,
    txHash,
    bountyId,
    solver,
    amountWei: amount.toString(),
    settlementToken,
    prUrl,
    timedOut,
    blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined
  };
}

/**
 * Verify a solver's on-chain submitSolution transaction on Bohr Testnet.
 * Matches: mined + success, sent to the escrow contract, and emitted SolutionSubmitted
 * for the expected bounty id by the expected solver wallet.
 * NOTE: submitSolution publishes the deliverable URL on-chain (public); the private
 * commitment path (submitSolutionCommitment) is not used by this release.
 */
export async function verifySubmissionTransaction({ txHash, expectedSolver, expectedBountyId }) {
  if (!isValidTxHashFormat(txHash)) {
    throw new Error(`Invalid transaction hash format: "${txHash}". Expected 66-character hex.`);
  }

  if (chainBypassEnabled()) {
    return { verified: true, simulated: true, txHash, solver: expectedSolver, bountyId: expectedBountyId };
  }

  const receipt = await fetchReceiptAcrossBotChains(txHash);
  if (!receipt) {
    throw new Error(`Submission transaction ${txHash} not found on BOT Chain Mainnet or Bohr Testnet. Fabricated hashes are rejected.`);
  }
  if (receipt.status !== 'success') {
    throw new Error(`Submission transaction ${txHash} failed or reverted on BOT Chain.`);
  }

  const targetTo = (receipt.to || '').toLowerCase();
  if (!KNOWN_ESCROW_CONTRACTS.has(targetTo)) {
    throw new Error(`Submission transaction was sent to ${receipt.to}, but active BOT Chain Escrow contract is ${config.escrowContractAddress}.`);
  }

  let submittedEvent = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== targetTo) continue;
    try {
      const decoded = decodeEventLog({ abi: ESCROW_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName === 'SolutionSubmitted') {
        submittedEvent = decoded;
        break;
      }
    } catch (e) {
      // ignore other events
    }
  }
  if (!submittedEvent) {
    throw new Error('Transaction did not emit SolutionSubmitted event on Bohr Escrow contract.');
  }

  const { bountyId, solver, prUrl } = submittedEvent.args;
  if (!expectedBountyId || bountyId.toLowerCase() !== expectedBountyId.toLowerCase()) {
    throw new Error(`On-chain submission bountyId (${bountyId}) does not match this bounty.`);
  }
  if (!expectedSolver || solver.toLowerCase() !== expectedSolver.toLowerCase()) {
    throw new Error(`On-chain submitter ${solver} does not match the submitting wallet (${expectedSolver}).`);
  }

  return {
    verified: true,
    txHash,
    bountyId,
    solver,
    prUrl,
    blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined
  };
}

function tokenDecimals(tokenAddress) {
  const t = (tokenAddress || '').toLowerCase();
  const usdt = [
    (config.usdtAddress || '').toLowerCase(),
    (config.usdtMainnetAddress || '').toLowerCase()
  ];
  return usdt.includes(t) ? 6 : 18;
}
