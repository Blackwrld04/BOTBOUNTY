import { createPublicClient, createWalletClient, http, parseEther, parseAbi, formatEther } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import fs from 'fs';
import path from 'path';

const MAINTAINER_PK = '0x285a7ba57b39eba8d310644c684f47c8231bcd3326ac036883491774de20ddb7';
const RPC_URL = 'https://rpc.bohr.life';

const maintainerAccount = privateKeyToAccount(MAINTAINER_PK);
const publicClient = createPublicClient({ transport: http(RPC_URL) });
const maintainerWallet = createWalletClient({
  account: maintainerAccount,
  transport: http(RPC_URL)
});

// Read compiled contract artifact from out/BotBountyEscrowTimeoutTest.sol/BotBountyEscrowTimeoutTest.json
const artifactPath = path.resolve('../contracts/out/BotBountyEscrowTimeoutTest.sol/BotBountyEscrowTimeoutTest.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

async function main() {
  console.log('--- Starting Bohr Testnet Live Review Timeout Execution ---');
  console.log('Maintainer Address:', maintainerAccount.address);

  const initialBalance = await publicClient.getBalance({ address: maintainerAccount.address });
  console.log('Maintainer Balance:', formatEther(initialBalance), 'tBOT');

  // Step 1: Deploy BotBountyEscrowTimeoutTest
  console.log('\n[1/5] Deploying BotBountyEscrowTimeoutTest on Bohr Testnet...');
  const deployHash = await maintainerWallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object
  });
  console.log('Deploy Tx Submitted:', deployHash);
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const contractAddress = deployReceipt.contractAddress;
  console.log('Deployed Contract Address:', contractAddress);
  console.log('Deploy Receipt Status:', deployReceipt.status);

  // Step 2: Create a Solver Account and fund it with 0.005 tBOT for gas
  console.log('\n[2/5] Creating and funding solver wallet...');
  const solverPk = generatePrivateKey();
  const solverAccount = privateKeyToAccount(solverPk);
  const solverWallet = createWalletClient({
    account: solverAccount,
    transport: http(RPC_URL)
  });
  console.log('Solver Address:', solverAccount.address);

  const fundHash = await maintainerWallet.sendTransaction({
    to: solverAccount.address,
    value: parseEther('0.03')
  });
  console.log('Fund Solver Tx:', fundHash);
  await publicClient.waitForTransactionReceipt({ hash: fundHash });
  console.log('Solver funded with 0.03 tBOT for gas');

  // Step 3: Maintainer creates a bounty with 10-second review period
  console.log('\n[3/5] Maintainer creates bounty with 10-second review period (0.001 tBOT escrow lock)...');
  const bountyId = ('0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''));
  const currentBlock = await publicClient.getBlock();
  const deadline = BigInt(Number(currentBlock.timestamp) + 3600);
  const reviewPeriod = 10n; // 10 seconds

  const createTxHash = await maintainerWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'createFastBounty',
    args: [bountyId, deadline, reviewPeriod, 'https://github.com/Blackwrld04/BOTBOUNTY/issues/99'],
    value: parseEther('0.001')
  });
  console.log('Bounty Created Tx:', createTxHash);
  await publicClient.waitForTransactionReceipt({ hash: createTxHash });

  // Step 4: Solver submits solution
  console.log('\n[4/5] Solver submits solution PR on-chain...');
  const submitTxHash = await solverWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'submitSolution',
    args: [bountyId, 'https://github.com/Blackwrld04/BOTBOUNTY/pull/99']
  });
  console.log('Submit Solution Tx:', submitTxHash);
  await publicClient.waitForTransactionReceipt({ hash: submitTxHash });

  // Step 5: Wait 15 seconds for review period to expire
  console.log('\n[5/5] Waiting 15 seconds for review period to elapse in real time...');
  await new Promise(r => setTimeout(r, 15000));

  // Step 6: Solver claims timeout release
  console.log('Solver executing claimTimeoutRelease(bountyId)...');
  const timeoutClaimTxHash = await solverWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'claimTimeoutRelease',
    args: [bountyId]
  });
  console.log('Timeout Claim Tx:', timeoutClaimTxHash);
  const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: timeoutClaimTxHash });
  console.log('Timeout Claim Receipt Status:', claimReceipt.status);

  const finalSolverBalance = await publicClient.getBalance({ address: solverAccount.address });
  console.log('Final Solver Balance (Reward Claimed):', formatEther(finalSolverBalance), 'tBOT');

  console.log('\n======================================================');
  console.log('LIVE BOHR TESTNET TIMEOUT VERIFICATION SUMMARY');
  console.log('======================================================');
  console.log('Contract:', contractAddress);
  console.log('Bounty ID:', bountyId);
  console.log('Funding Tx:', `https://scan.bohr.life/tx/${createTxHash}`);
  console.log('Submission Tx:', `https://scan.bohr.life/tx/${submitTxHash}`);
  console.log('Timeout Claim Tx:', `https://scan.bohr.life/tx/${timeoutClaimTxHash}`);
  console.log('======================================================');

  // Save evidence to a JSON file
  const evidence = {
    contractAddress,
    bountyId,
    reviewPeriodSeconds: 10,
    maintainer: maintainerAccount.address,
    solver: solverAccount.address,
    deployTx: deployHash,
    createTx: createTxHash,
    submitTx: submitTxHash,
    timeoutClaimTx: timeoutClaimTxHash,
    status: claimReceipt.status,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync('./bohr_timeout_evidence.json', JSON.stringify(evidence, null, 2));
  console.log('Saved to bohr_timeout_evidence.json');
}

main().catch(console.error);
