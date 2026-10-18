import { createPublicClient, createWalletClient, http, parseAbi, decodeEventLog, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
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

export function getPublicClient() {
  return createPublicClient({
    transport: http(config.botRpcUrl || 'https://rpc.bohr.life')
  });
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
export async function verifyDepositTransaction({ txHash, expectedAmount, expectedToken = '0x0000000000000000000000000000000000000000' }) {
  if (!isValidTxHashFormat(txHash)) {
    throw new Error(`Invalid transaction hash format: "${txHash}". Expected 66-character hex.`);
  }

  if (isDepositTxReused(txHash)) {
    throw new Error(`Transaction hash ${txHash} has already been used to fund another bounty.`);
  }

  // Allow bypass in memory test environment unless explicit live verification is requested
  if (process.env.NODE_ENV === 'test' && (!process.env.VERIFY_LIVE_BOHR || process.env.VERIFY_LIVE_BOHR !== 'true')) {
    return {
      verified: true,
      simulated: true,
      txHash,
      bountyId: '0x' + '1'.repeat(64),
      maintainer: '0xBE0aaE21b6252aa1207cAa50A753e8C45bCBCbc5',
      amountWei: '10000000000000000'
    };
  }

  const client = getPublicClient();

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch (err) {
    throw new Error(`Transaction ${txHash} not found on BOT Chain Bohr Testnet. Fabricated transactions are rejected.`);
  }

  if (!receipt) {
    throw new Error(`Transaction ${txHash} not found on BOT Chain Bohr Testnet. Fabricated transactions are rejected.`);
  }

  if (receipt.status !== 'success') {
    throw new Error(`Transaction ${txHash} failed or reverted on BOT Chain Bohr Testnet.`);
  }

  const expectedContract = (config.escrowContractAddress || '0xB128F2f442554B6517D779788F28F2EB2612164A').toLowerCase();
  if (receipt.to?.toLowerCase() !== expectedContract) {
    throw new Error(`Transaction was sent to ${receipt.to}, but active Bohr Escrow contract is ${expectedContract}.`);
  }

  // Parse BountyCreated event
  let createdEvent = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== expectedContract) continue;
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

  // Check amount matches if expectedAmount is provided
  if (expectedAmount !== undefined && expectedAmount !== null) {
    const isUsdt = settlementToken.toLowerCase() === (process.env.USDT_ADDRESS || '0x75edc9335175fc0552d51d48439f229c10420fe3').toLowerCase() || settlementToken.toLowerCase() === '0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c';
    const decimals = isUsdt ? 6 : 18;
    const expectedAmountWei = typeof expectedAmount === 'bigint' ? expectedAmount : BigInt(Math.round(parseFloat(expectedAmount) * Math.pow(10, decimals)));
    // Allow slight tolerance or exact match
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
  expectedBountyId
}) {
  if (!isValidTxHashFormat(txHash)) {
    throw new Error(`Invalid transaction hash format: "${txHash}". Expected 66-character hex.`);
  }

  if (isSettlementTxReused(txHash)) {
    throw new Error(`Settlement transaction hash ${txHash} has already been recorded in platform disbursements.`);
  }

  // Allow bypass in memory test environment unless explicit live verification is requested
  if (process.env.NODE_ENV === 'test' && (!process.env.VERIFY_LIVE_BOHR || process.env.VERIFY_LIVE_BOHR !== 'true')) {
    return {
      verified: true,
      simulated: true,
      txHash,
      solver: expectedSolver || '0x53e3800847e5Bb6fAfA0853d3e5a884B22aF8a20',
      amountWei: '10000000000000000'
    };
  }

  const client = getPublicClient();

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch (err) {
    throw new Error(`Settlement transaction ${txHash} not found on BOT Chain Bohr Testnet. Fabricated hashes are rejected.`);
  }

  if (!receipt) {
    throw new Error(`Settlement transaction ${txHash} not found on BOT Chain Bohr Testnet. Fabricated hashes are rejected.`);
  }

  if (receipt.status !== 'success') {
    throw new Error(`Settlement transaction ${txHash} failed or reverted on BOT Chain Bohr Testnet.`);
  }

  const expectedContract = (config.escrowContractAddress || '0xB128F2f442554B6517D779788F28F2EB2612164A').toLowerCase();

  // Find BountySettled event
  let settledEvent = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== expectedContract) continue;
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

  // Verify recipient solver matches
  if (expectedSolver && solver.toLowerCase() !== expectedSolver.toLowerCase()) {
    throw new Error(`On-chain recipient ${solver} does not match the winning solver's wallet address (${expectedSolver}).`);
  }

  // Verify bounty ID if provided
  if (expectedBountyId && bountyId.toLowerCase() !== expectedBountyId.toLowerCase()) {
    throw new Error(`On-chain settlement bountyId (${bountyId}) does not match this bounty.`);
  }

  // Check amount
  if (expectedAmount !== undefined && expectedAmount !== null) {
    const expectedAmountWei = typeof expectedAmount === 'bigint' ? expectedAmount : BigInt(Math.round(parseFloat(expectedAmount) * 1e18));
    if (amount < expectedAmountWei) {
      throw new Error(`On-chain settled amount (${formatEther(amount)} BOT) does not match expected reward amount (${formatEther(expectedAmountWei)} BOT).`);
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
 * Execute on-chain releaseBounty directly from server using maintainer account
 */
export async function executeOnChainRelease({ onChainBountyId }) {
  const privateKey = config.facilitatorPrivateKey;
  if (!privateKey || privateKey === '0x0000000000000000000000000000000000000000000000000000000000000001') {
    throw new Error('Platform maintainer private key is not configured for autonomous on-chain release.');
  }

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    transport: http(config.botRpcUrl || 'https://rpc.bohr.life')
  });

  const txHash = await walletClient.writeContract({
    address: config.escrowContractAddress,
    abi: ESCROW_ABI,
    functionName: 'releaseBounty',
    args: [onChainBountyId]
  });

  const publicClient = getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status !== 'success') {
    throw new Error(`On-chain release transaction ${txHash} reverted on Bohr Testnet.`);
  }

  return {
    txHash,
    receipt,
    maintainer: account.address
  };
}
