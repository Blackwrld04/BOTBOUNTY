import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidTxHashFormat,
  isDepositTxReused,
  isSettlementTxReused,
  verifyDepositTransaction,
  verifySettlementTransaction,
  verifySubmissionTransaction,
  toBaseUnits
} from '../src/services/onchainVerifier.js';
import { db, createBountyRecord, createBountySubmission } from '../src/db.js';

const CONTRACT = '0xB128F2f442554B6517D779788F28F2EB2612164A';
const ESCROW_SETTLED_TOPIC = '0x3cb71ce317fd0527ef6d5aa29290ea1734330175d91f4172c858d8e00e684d5c';
const REAL_SOLVER = '0xe98AA13d7F2c43Ca8C429176754380aE356eEB93';
const REAL_BOUNTY_ID = '0xd9058e9c99df5be64d9a17d30ca7004e0f5309676aa63eb6a5814744f6004dad';

const txHash = (char) => `0x${char.repeat(64)}`;

/**
 * Captured BountySettled receipt shape:
 * bountyId, solver, settlementToken(0), amount(0.05e18), prUrl,
 * timedOut(true). Used to exercise event parsing without a live RPC.
 */
function settlementReceipt({ timedOut = true, amountHex = 'b1a2bc2ec50000' } = {}) {
  const amountWord = amountHex.padStart(64, '0');
  const timedOutWord = (timedOut ? '1' : '0').padStart(64, '0');
  const url = 'https://github.com/Blackwrld04/BOTBOUNTY/pull/105';
  const urlHex = Buffer.from(url, 'utf8').toString('hex');
  const urlLengthWord = url.length.toString(16).padStart(64, '0');
  const urlPadded = urlHex.padEnd(Math.ceil(urlHex.length / 64) * 64, '0');
  const offsetWord = (128).toString(16).padStart(64, '0');

  return {
    status: 'success',
    to: CONTRACT,
    blockNumber: 1234567n,
    logs: [
      {
        address: CONTRACT,
        topics: [ESCROW_SETTLED_TOPIC, REAL_BOUNTY_ID, `0x${REAL_SOLVER.slice(2).toLowerCase().padStart(64, '0')}`],
        data: `0x${'0'.repeat(64)}${amountWord}${offsetWord}${timedOutWord}${urlLengthWord}${urlPadded}`
      }
    ]
  };
}

test('On-Chain Verifier & Anti-Fabrication Security Suite', async (t) => {
  const dummyTxHash = txHash('a');
  const reusedDepositHash = txHash('b');

  await t.test('isValidTxHashFormat strictly validates 66-character EVM transaction hashes', () => {
    assert.equal(isValidTxHashFormat(dummyTxHash), true);
    assert.equal(isValidTxHashFormat('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'), true);

    assert.equal(isValidTxHashFormat('not-a-hash'), false);
    assert.equal(isValidTxHashFormat('0x' + 'a'.repeat(63)), false);
    assert.equal(isValidTxHashFormat('0x' + 'a'.repeat(65)), false);
    assert.equal(isValidTxHashFormat('a'.repeat(64)), false);
    assert.equal(isValidTxHashFormat('0x' + 'g'.repeat(64)), false);
    assert.equal(isValidTxHashFormat(null), false);
    assert.equal(isValidTxHashFormat(undefined), false);
    assert.equal(isValidTxHashFormat(12345), false);
  });

  await t.test('toBaseUnits converts decimals without floating-point rounding', () => {
    assert.equal(toBaseUnits('0.05', 18), 50_000_000_000_000_000n);
    assert.equal(toBaseUnits('1', 18), 10n ** 18n);
    assert.equal(toBaseUnits('1.5', 6), 1_500_000n);
    assert.equal(toBaseUnits(5, 0), 5n);
    assert.throws(() => toBaseUnits('1.1234567', 6), /more than 6 decimal places/);
    assert.throws(() => toBaseUnits('-1', 18), /Invalid token amount/);
  });

  let testBounty;
  await t.test('isDepositTxReused detects duplicate on-chain deposit hashes', () => {
    assert.equal(isDepositTxReused(reusedDepositHash), false);

    testBounty = createBountyRecord({
      title: 'Anti-Replay Test Bounty',
      description: 'Verifying on-chain deposit tx replay prevention',
      amount: 0.05,
      issueUrl: 'https://github.com/Blackwrld04/BOTBOUNTY/issues/999',
      depositTx: reusedDepositHash,
      maintainer: '0x1111111111111111111111111111111111111111'
    });

    assert.equal(isDepositTxReused(reusedDepositHash), true);
    assert.equal(isDepositTxReused(reusedDepositHash.toUpperCase()), true);
  });

  await t.test('isSettlementTxReused detects duplicate settlement / disbursement hashes', () => {
    const settlementHash = txHash('c');
    assert.equal(isSettlementTxReused(settlementHash), false);

    const openBounty = createBountyRecord({
      title: 'Settlement Anti-Replay Bounty',
      description: 'Verifying settlement disbursement replay prevention',
      amount: 0.05,
      issueUrl: 'https://github.com/Blackwrld04/BOTBOUNTY/issues/998',
      depositTx: txHash('d'),
      maintainer: '0x1111111111111111111111111111111111111111'
    });
    db.prepare(`UPDATE bounties SET status = 'Open', payment_status = 'funded' WHERE id = ?`).run(openBounty.id);

    const sub = createBountySubmission({
      bountyId: openBounty.id,
      creatorName: 'Test Solver',
      submissionUrl: 'https://github.com/Blackwrld04/BOTBOUNTY/pull/500',
      walletAddress: '0x53e3800847e5Bb6fAfA0853d3e5a884B22aF8a20'
    });

    db.prepare(`
      INSERT INTO disbursements (id, bounty_id, submission_id, recipient_address, amount, tx_hash, admin_email, distributed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'disb_test_replay',
      openBounty.id,
      sub.id,
      '0x53e3800847e5Bb6fAfA0853d3e5a884B22aF8a20',
      0.05,
      settlementHash,
      'admin@example.com',
      Date.now()
    );

    assert.equal(isSettlementTxReused(settlementHash), true);
    assert.equal(isSettlementTxReused(settlementHash.toUpperCase()), true);
  });

  await t.test('verifyDepositTransaction rejects invalid hash format', async () => {
    await assert.rejects(
      async () => verifyDepositTransaction({ txHash: 'fabricated-random-string' }),
      /Invalid transaction hash format/
    );
  });

  await t.test('verifyDepositTransaction rejects reused deposit hashes', async () => {
    await assert.rejects(
      async () => verifyDepositTransaction({ txHash: reusedDepositHash }),
      /already been used to fund another bounty/
    );
  });

  await t.test('test-only bypass requires explicit opt-in and marks results simulated', async () => {
    // The npm test script sets NODE_ENV=test and ALLOW_UNVERIFIED_CHAIN_TXS=true.
    assert.equal(process.env.NODE_ENV, 'test');
    const result = await verifyDepositTransaction({
      txHash: txHash('1'),
      expectedAmount: '0.05',
      expectedMaintainer: '0x1111111111111111111111111111111111111111'
    });
    assert.equal(result.verified, true);
    assert.equal(result.simulated, true);
    assert.equal(result.amountWei, '50000000000000000');
  });

  await t.test('verifySettlementTransaction rejects invalid hash format', async () => {
    await assert.rejects(
      async () => verifySettlementTransaction({ txHash: '0xinvalid' }),
      /Invalid transaction hash format/
    );
  });

  await t.test('verifySettlementTransaction rejects reused disbursement hashes', async () => {
    await assert.rejects(
      async () => verifySettlementTransaction({ txHash: txHash('c') }),
      /already been recorded in platform disbursements/
    );
  });

  await t.test('settlement event parser accepts a matching timeout auto-claim', async () => {
    const result = await verifySettlementTransaction({
      txHash: txHash('2'),
      expectedSolver: REAL_SOLVER,
      expectedBountyId: REAL_BOUNTY_ID,
      expectedAmount: 0.05,
      receipt: settlementReceipt({ timedOut: true })
    });

    assert.equal(result.verified, true);
    assert.equal(result.solver.toLowerCase(), REAL_SOLVER.toLowerCase());
    assert.equal(result.bountyId.toLowerCase(), REAL_BOUNTY_ID.toLowerCase());
    assert.equal(result.timedOut, true);
    assert.equal(result.amountWei, '50000000000000000');
  });

  await t.test('settlement event parser rejects a mismatched solver', async () => {
    await assert.rejects(
      async () => verifySettlementTransaction({
        txHash: txHash('3'),
        expectedSolver: '0x000000000000000000000000000000000000dead',
        expectedBountyId: REAL_BOUNTY_ID,
        expectedAmount: 0.05,
        receipt: settlementReceipt()
      }),
      /does not match the winning solver/
    );
  });

  await t.test('settlement event parser rejects a mismatched bountyId', async () => {
    await assert.rejects(
      async () => verifySettlementTransaction({
        txHash: txHash('4'),
        expectedSolver: REAL_SOLVER,
        expectedBountyId: txHash('5'),
        expectedAmount: 0.05,
        receipt: settlementReceipt()
      }),
      /does not match this bounty/
    );
  });

  await t.test('settlement event parser rejects an amount mismatch', async () => {
    await assert.rejects(
      async () => verifySettlementTransaction({
        txHash: txHash('6'),
        expectedSolver: REAL_SOLVER,
        expectedBountyId: REAL_BOUNTY_ID,
        expectedAmount: 1.0,
        receipt: settlementReceipt()
      }),
      /does not match expected reward amount/
    );
  });

  await t.test('settlement event parser rejects a transaction sent to another contract', async () => {
    await assert.rejects(
      async () => verifySettlementTransaction({
        txHash: txHash('7'),
        expectedSolver: REAL_SOLVER,
        expectedBountyId: REAL_BOUNTY_ID,
        expectedAmount: 0.05,
        contractAddress: '0x9999999999999999999999999999999999999999',
        receipt: settlementReceipt()
      }),
      /was sent to/
    );
  });

  await t.test('settlement event parser rejects a receipt without BountySettled', async () => {
    await assert.rejects(
      async () => verifySettlementTransaction({
        txHash: txHash('8'),
        expectedSolver: REAL_SOLVER,
        expectedBountyId: REAL_BOUNTY_ID,
        expectedAmount: 0.05,
        receipt: { status: 'success', to: CONTRACT, blockNumber: 1n, logs: [] }
      }),
      /did not emit BountySettled/
    );
  });

  await t.test('settlement event parser rejects a reverted transaction', async () => {
    await assert.rejects(
      async () => verifySettlementTransaction({
        txHash: txHash('9'),
        expectedSolver: REAL_SOLVER,
        expectedBountyId: REAL_BOUNTY_ID,
        expectedAmount: 0.05,
        receipt: { ...settlementReceipt(), status: 'reverted' }
      }),
      /failed or reverted/
    );
  });

  await t.test('verifySubmissionTransaction bypass is explicit and simulated', async () => {
    const result = await verifySubmissionTransaction({
      txHash: txHash('f'),
      expectedSolver: '0x2222222222222222222222222222222222222222',
      expectedBountyId: txHash('e')
    });
    assert.equal(result.verified, true);
    assert.equal(result.simulated, true);
  });

  await t.test('a fabricated hash is rejected when the test bypass is disabled', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousBypass = process.env.ALLOW_UNVERIFIED_CHAIN_TXS;
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_UNVERIFIED_CHAIN_TXS = 'false';

    try {
      await assert.rejects(
        async () => verifySettlementTransaction({
          txHash: txHash('0'),
          expectedSolver: REAL_SOLVER,
          expectedBountyId: REAL_BOUNTY_ID,
          expectedAmount: 0.05
        }),
        /not found on BOT Chain Bohr Testnet|Fabricated hashes are rejected/
      );
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.ALLOW_UNVERIFIED_CHAIN_TXS = previousBypass;
    }
  });
});
