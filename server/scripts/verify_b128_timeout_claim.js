import { createPublicClient, createWalletClient, http, parseAbi, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RPC_URL = 'https://rpc.bohr.life';
const trackingData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../b128_timeout_tracking.json'), 'utf8'));

let solverPk = process.env.SOLVER_PRIVATE_KEY;
const secretFile = path.resolve(__dirname, '../.solver_secret');
if (!solverPk && fs.existsSync(secretFile)) {
  solverPk = fs.readFileSync(secretFile, 'utf8').trim();
}

const ESCROW_ABI = parseAbi([
  'function claimTimeoutRelease(bytes32 bountyId) external',
  'function bounties(bytes32) view returns (bytes32 bountyId, address maintainer, address solver, address settlementToken, uint256 amount, uint256 createdAt, uint256 deadline, uint256 submittedAt, uint256 reviewPeriod, uint8 status, string issueUrl, string prUrl, bytes32 solutionCommitment)',
  'event BountySettled(bytes32 indexed bountyId, address indexed solver, address settlementToken, uint256 amount, string prUrl, bool timedOut)'
]);

async function main() {
  const publicClient = createPublicClient({ transport: http(RPC_URL) });
  const b = await publicClient.readContract({
    address: trackingData.contractAddress,
    abi: ESCROW_ABI,
    functionName: 'bounties',
    args: [trackingData.bountyId]
  });

  console.log('Contract:', trackingData.contractAddress);
  console.log('Bounty ID:', trackingData.bountyId);
  console.log('Status on Bohr:', ['Open', 'InReview', 'Settled', 'Refunded'][b[9]], `(${b[9]})`);
  console.log('Solver:', b[2]);
  console.log('Amount:', formatEther(b[4]), 'BOT');
  console.log('Claim Tx Hash:', trackingData.claimTx);
  console.log('Claim Block:', trackingData.claimBlock);
}

main().catch(console.error);
