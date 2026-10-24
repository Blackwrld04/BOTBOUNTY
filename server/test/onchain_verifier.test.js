import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidTxHashFormat,
  isDepositTxReused,
  isSettlementTxReused,
  verifyDepositTransaction,
  verifySettlementTransaction,
  getPublicClient
} from '../src/services/onchainVerifier.js';
import { db, createBountyRecord, createBountySubmission } from '../src/db.js';

test('On-Chain Verifier & Anti-Fabrication Security Suite', async (t) => {
  const dummyTxHash = '0x' + 'a'.repeat(64);
  const reusedTxHash = '0x' + 'b'.repeat(64);

  await t.test('isValidTxHashFormat strictly validates 66-character EVM transaction hashes', () => {
    assert.equal(isValidTxHashFormat(dummyTxHash), true);
    assert.equal(isValidTxHashFormat('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'), true);
    
    // Invalid cases
    assert.equal(isValidTxHashFormat('not-a-hash'), false);
    assert.equal(isValidTxHashFormat('0x' + 'a'.repeat(63)), false); // too short
    assert.equal(isValidTxHashFormat('0x' + 'a'.repeat(65)), false); // too long
    assert.equal(isValidTxHashFormat('a'.repeat(64)), false); // missing 0x
    assert.equal(isValidTxHashFormat('0x' + 'g'.repeat(64)), false); // non-hex character
    assert.equal(isValidTxHashFormat(null), false);
    assert.equal(isValidTxHashFormat(undefined), false);
    assert.equal(isValidTxHashFormat(12345), false);
  });

  let testBounty;
  await t.test('isDepositTxReused detects duplicate on-chain deposit hashes', () => {
    // Before insert
    assert.equal(isDepositTxReused(reusedTxHash), false);

    // Create a bounty with depositTx = reusedTxHash
    testBounty = createBountyRecord({
      title: 'Anti-Replay Test Bounty',
      description: 'Verifying on-chain deposit tx replay prevention',
      reward: 0.05,
      issueUrl: 'https://github.com/Blackwrld04/BOTBOUNTY/issues/999',
      depositTx: reusedTxHash,
      creatorAddress: '0xBE0aaE21b6252aa1207cAa50A753e8C45bCBCbc5'
    });

    // After insert
    assert.equal(isDepositTxReused(reusedTxHash), true);
    // Case insensitivity
    assert.equal(isDepositTxReused(reusedTxHash.toUpperCase()), true);
  });

  await t.test('isSettlementTxReused detects duplicate settlement / disbursement hashes', () => {
    const settlementHash = '0x' + 'c'.repeat(64);
    assert.equal(isSettlementTxReused(settlementHash), false);

    // Create an open bounty for foreign key
    const openBounty = createBountyRecord({
      title: 'Settlement Anti-Replay Bounty',
      description: 'Verifying settlement disbursement replay prevention',
      amount: 0.05,
      status: 'Open',
      issueUrl: 'https://github.com/Blackwrld04/BOTBOUNTY/issues/998',
      creatorAddress: '0xBE0aaE21b6252aa1207cAa50A753e8C45bCBCbc5'
    });

    // Create valid submission for foreign key
    const sub = createBountySubmission({
      bountyId: openBounty.id,
      creatorName: 'Test Solver',
      submissionUrl: 'https://github.com/Blackwrld04/BOTBOUNTY/pull/500',
      walletAddress: '0x53e3800847e5Bb6fAfA0853d3e5a884B22aF8a20'
    });

    // Record disbursement in DB
    db.prepare(`
      INSERT INTO disbursements (id, bounty_id, submission_id, recipient_address, amount, tx_hash, admin_email, distributed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('disb_test_replay', openBounty.id, sub.id, '0x53e3800847e5Bb6fAfA0853d3e5a884B22aF8a20', 0.05, settlementHash, 'admin@bohr.network', Date.now());

    assert.equal(isSettlementTxReused(settlementHash), true);
    assert.equal(isSettlementTxReused(settlementHash.toUpperCase()), true);
  });

  await t.test('verifyDepositTransaction rejects invalid hash format', async () => {
    await assert.rejects(
      async () => {
        await verifyDepositTransaction({ txHash: 'fabricated-random-string' });
      },
      /Invalid transaction hash format/
    );
  });

  await t.test('verifyDepositTransaction rejects reused deposit hashes', async () => {
    await assert.rejects(
      async () => {
        await verifyDepositTransaction({ txHash: reusedTxHash });
      },
      /already been used to fund another bounty/
    );
  });

  await t.test('verifySettlementTransaction rejects invalid hash format', async () => {
    await assert.rejects(
      async () => {
        await verifySettlementTransaction({ txHash: '0xinvalid' });
      },
      /Invalid transaction hash format/
    );
  });

  await t.test('verifySettlementTransaction rejects reused disbursement hashes', async () => {
    const settlementHash = '0x' + 'c'.repeat(64);
    await assert.rejects(
      async () => {
        await verifySettlementTransaction({ txHash: settlementHash });
      },
      /already been recorded in platform disbursements/
    );
  });

  await t.test('Live Bohr RPC rejects fabricated transaction hash', async () => {
    const client = getPublicClient();
    const fakeHash = '0x0000000000000000000000000000000000000000000000000000000000000001';
    
    let caught = false;
    try {
      const receipt = await client.getTransactionReceipt({ hash: fakeHash });
      if (!receipt) caught = true;
    } catch (err) {
      caught = true;
    }
    assert.equal(caught, true, 'Fabricated transaction hash was successfully rejected as non-existent by Bohr RPC');
  });

  await t.test('Live Bohr RPC accurately fetches confirmed Bohr contract deployment tx', async () => {
    const client = getPublicClient();
    // Confirmed on-chain BotBountyEscrow deployment on Bohr Testnet (Chain ID 968)
    const realTxHash = '0x6b40a134cdb7b0ec20e8aaa9391ff9481f3d5d59f37c76d09e6c8fb36e6cc14f';
    
    const receipt = await client.getTransactionReceipt({ hash: realTxHash });
    assert.ok(receipt, 'Receipt found on Bohr Testnet');
    assert.equal(receipt.status, 'success', 'Transaction succeeded');
    assert.ok(receipt.blockNumber > 0n, 'Block number is positive');
  });

  await t.test('Live Bohr verification rejects fabricated settlement transaction hash', async () => {
    const prevEnv = process.env.VERIFY_LIVE_BOHR;
    process.env.VERIFY_LIVE_BOHR = 'true';
    try {
      const fakeHash = '0x1111111111111111111111111111111111111111111111111111111111111111';
      await assert.rejects(
        async () => {
          await verifySettlementTransaction({
            txHash: fakeHash,
            expectedSolver: '0xe98AA13d7F2c43Ca8C429176754380aE356eEB93',
            expectedBountyId: '0xd9058e9c99df5be64d9a17d30ca7004e0f5309676aa63eb6a5814744f6004dad',
            expectedAmount: 0.05
          });
        },
        /Fabricated hashes are rejected|not found on BOT Chain Bohr Testnet/
      );
    } finally {
      process.env.VERIFY_LIVE_BOHR = prevEnv;
    }
  });

  await t.test('Live Bohr verification rejects mismatched solver recipient', async () => {
    const prevEnv = process.env.VERIFY_LIVE_BOHR;
    process.env.VERIFY_LIVE_BOHR = 'true';
    try {
      const realSettlementTx = '0x298eea41edf0dab2629a8aa45ba03b88ec57bf6681a5c5bd472ab71e3af6dce4';
      await assert.rejects(
        async () => {
          await verifySettlementTransaction({
            txHash: realSettlementTx,
            expectedSolver: '0x000000000000000000000000000000000000dead', // wrong solver
            expectedBountyId: '0xd9058e9c99df5be64d9a17d30ca7004e0f5309676aa63eb6a5814744f6004dad',
            expectedAmount: 0.05
          });
        },
        /does not match the winning solver's wallet address/
      );
    } finally {
      process.env.VERIFY_LIVE_BOHR = prevEnv;
    }
  });

  await t.test('Live Bohr verification rejects mismatched bountyId', async () => {
    const prevEnv = process.env.VERIFY_LIVE_BOHR;
    process.env.VERIFY_LIVE_BOHR = 'true';
    try {
      const realSettlementTx = '0x298eea41edf0dab2629a8aa45ba03b88ec57bf6681a5c5bd472ab71e3af6dce4';
      await assert.rejects(
        async () => {
          await verifySettlementTransaction({
            txHash: realSettlementTx,
            expectedSolver: '0xe98AA13d7F2c43Ca8C429176754380aE356eEB93',
            expectedBountyId: '0x9999999999999999999999999999999999999999999999999999999999999999', // wrong bountyId
            expectedAmount: 0.05
          });
        },
        /does not match this bounty/
      );
    } finally {
      process.env.VERIFY_LIVE_BOHR = prevEnv;
    }
  });

  await t.test('Live Bohr verification rejects insufficient settled amount', async () => {
    const prevEnv = process.env.VERIFY_LIVE_BOHR;
    process.env.VERIFY_LIVE_BOHR = 'true';
    try {
      const realSettlementTx = '0x298eea41edf0dab2629a8aa45ba03b88ec57bf6681a5c5bd472ab71e3af6dce4';
      await assert.rejects(
        async () => {
          await verifySettlementTransaction({
            txHash: realSettlementTx,
            expectedSolver: '0xe98AA13d7F2c43Ca8C429176754380aE356eEB93',
            expectedBountyId: '0xd9058e9c99df5be64d9a17d30ca7004e0f5309676aa63eb6a5814744f6004dad',
            expectedAmount: 1.0 // expected 1.0 BOT, settled was 0.05 BOT
          });
        },
        /is less than expected reward amount/
      );
    } finally {
      process.env.VERIFY_LIVE_BOHR = prevEnv;
    }
  });

  await t.test('Live Bohr verification successfully validates matching settlement tx', async () => {
    const prevEnv = process.env.VERIFY_LIVE_BOHR;
    process.env.VERIFY_LIVE_BOHR = 'true';
    try {
      const realSettlementTx = '0x298eea41edf0dab2629a8aa45ba03b88ec57bf6681a5c5bd472ab71e3af6dce4';
      const result = await verifySettlementTransaction({
        txHash: realSettlementTx,
        expectedSolver: '0xe98AA13d7F2c43Ca8C429176754380aE356eEB93',
        expectedBountyId: '0xd9058e9c99df5be64d9a17d30ca7004e0f5309676aa63eb6a5814744f6004dad',
        expectedAmount: 0.05
      });
      assert.equal(result.verified, true);
      assert.equal(result.solver.toLowerCase(), '0xe98AA13d7F2c43Ca8C429176754380aE356eEB93'.toLowerCase());
      assert.equal(result.bountyId.toLowerCase(), '0xd9058e9c99df5be64d9a17d30ca7004e0f5309676aa63eb6a5814744f6004dad'.toLowerCase());
    } finally {
      process.env.VERIFY_LIVE_BOHR = prevEnv;
    }
  });

  await t.test('verifySettlementTransaction strictly rejects timeout auto-claims during pilot via actual verifier', async () => {
    const dummyHash = '0x' + '9'.repeat(64);
    const mockReceipt = {
      status: 'success',
      to: '0xB128F2f442554B6517D779788F28F2EB2612164A',
      blockNumber: 1234567n,
      logs: [
        {
          address: '0xB128F2f442554B6517D779788F28F2EB2612164A',
          topics: [
            '0x3cb71ce317fd0527ef6d5aa29290ea1734330175d91f4172c858d8e00e684d5c',
            '0xd9058e9c99df5be64d9a17d30ca7004e0f5309676aa63eb6a5814744f6004dad',
            '0x000000000000000000000000e98aa13d7f2c43ca8c429176754380ae356eeb93'
          ],
          data: '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b1a2bc2ec5000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000003168747470733a2f2f6769746875622e636f6d2f426c61636b77726c6430342f424f54424f554e54592f70756c6c2f313035000000000000000000000000000000'
        }
      ]
    };

    // Calls the ACTUAL verifier function and asserts it throws
    await assert.rejects(
      async () => {
        await verifySettlementTransaction({
          txHash: dummyHash,
          expectedSolver: '0xe98AA13d7F2c43Ca8C429176754380aE356eEB93',
          expectedBountyId: '0xd9058e9c99df5be64d9a17d30ca7004e0f5309676aa63eb6a5814744f6004dad',
          expectedAmount: 0.05,
          receipt: mockReceipt
        });
      },
      /Review timeout auto-claims \(claimTimeoutRelease\) are disabled throughout the native-\$BOT pilot/
    );
  });

  await t.test('Live Bohr verification rejects live on-chain claimTimeoutRelease transaction', async () => {
    const prevEnv = process.env.VERIFY_LIVE_BOHR;
    process.env.VERIFY_LIVE_BOHR = 'true';
    try {
      // 0x941cb175... is an authentic on-chain claimTimeoutRelease tx on Bohr Testnet
      const liveTimeoutTx = '0x941cb175bee2faa892447b652c0537c865386e92249fe6338cf96e0a6b714d55';
      await assert.rejects(
        async () => {
          await verifySettlementTransaction({
            txHash: liveTimeoutTx,
            expectedSolver: '0x5e0644a34346c908dc289175BCF8212d5627474E',
            expectedBountyId: '0x95df2ff8b625d16bd5086d502667c186afd53b46c8d3d3ee4f07ba76cc693936',
            expectedAmount: 0.001,
            contractAddress: '0xe5558c2b80c2f8327030de7fbfa74ff7aa5f8e62'
          });
        },
        /Review timeout auto-claims \(claimTimeoutRelease\) are disabled throughout the native-\$BOT pilot/
      );
    } finally {
      process.env.VERIFY_LIVE_BOHR = prevEnv;
    }
  });
});
