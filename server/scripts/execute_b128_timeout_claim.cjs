const { ethers } = require('/home/blackwrld04/BOTBOUNTY/client/node_modules/ethers');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'https://rpc.bohr.life';
const trackingData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../b128_timeout_tracking.json'), 'utf8'));

let solverPk = process.env.SOLVER_PRIVATE_KEY;
const secretFile = path.resolve(__dirname, '../.solver_secret');
if (!solverPk && fs.existsSync(secretFile)) {
  solverPk = fs.readFileSync(secretFile, 'utf8').trim();
}

if (!solverPk) {
  console.error('Error: Solver private key not found in SOLVER_PRIVATE_KEY env or .solver_secret');
  process.exit(1);
}

const ESCROW_ABI = [
  'function claimTimeoutRelease(bytes32 bountyId) external',
  'function bounties(bytes32) view returns (bytes32 bountyId, address maintainer, address solver, address settlementToken, uint256 amount, uint256 createdAt, uint256 deadline, uint256 submittedAt, uint256 reviewPeriod, uint8 status, string issueUrl, string prUrl, bytes32 solutionCommitment)',
  'event BountySettled(bytes32 indexed bountyId, address indexed solver, address settlementToken, uint256 amount, string prUrl, bool timedOut)'
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const solver = new ethers.Wallet(solverPk, provider);
  const escrow = new ethers.Contract(trackingData.contractAddress, ESCROW_ABI, solver);

  console.log('Contract:', trackingData.contractAddress);
  console.log('Bounty ID:', trackingData.bountyId);
  console.log('Solver:', solver.address);

  const initialBal = await provider.getBalance(solver.address);
  console.log('Current Solver Balance:', ethers.formatEther(initialBal), 'BOT');

  const currentBlock = await provider.getBlock('latest');
  const now = currentBlock.timestamp;
  const expiry = trackingData.reviewExpiryTimestamp;
  const remaining = expiry - now;

  if (remaining > 0) {
    console.log(`Review period still active. ${remaining} seconds remaining (${(remaining / 3600).toFixed(2)} hours).`);
    console.log('Expiry ISO:', trackingData.reviewExpiryIso);
    return;
  }

  console.log('Review period has elapsed! Executing claimTimeoutRelease on B128...');
  const tx = await escrow.claimTimeoutRelease(trackingData.bountyId);
  console.log('Claim Tx Hash:', tx.hash);
  const receipt = await tx.wait(1);
  console.log('Claim Mined in Block:', receipt.blockNumber, 'Status:', receipt.status);

  const finalBal = await provider.getBalance(solver.address);
  console.log('Final Solver Balance:', ethers.formatEther(finalBal), 'BOT');
  console.log('Net Gain:', ethers.formatEther(finalBal - initialBal), 'BOT');

  trackingData.claimTx = tx.hash;
  trackingData.claimBlock = receipt.blockNumber;
  trackingData.status = 'SettledViaTimeout';
  trackingData.finalSolverBalance = ethers.formatEther(finalBal) + ' BOT';
  fs.writeFileSync(path.resolve(__dirname, '../b128_timeout_tracking.json'), JSON.stringify(trackingData, null, 2));
  console.log('Updated tracking JSON with successful settlement!');
}

main().catch(console.error);
