import test from 'node:test';
import assert from 'node:assert/strict';

// Administrators must be explicitly configured; there are no built-in identities.
process.env.ADMIN_EMAILS = 'admin@example.com,second-admin@example.com';
process.env.ADMIN_WALLETS = '0x1111111111111111111111111111111111111111';
process.env.ADMIN_PASSWORD = 'test-only-admin-password-32-chars';

import {
  getAllBounties,
  getBountyById,
  createBountyRecord,
  createBountySubmission,
  updateBountySubmission,
  getBountySubmissions,
  disburseBountyReward,
  getAdminOverviewStats,
  isAdminUser,
  createUser,
  createSession,
  getUserProfileStats,
  getLeaderboard,
  getAllUsers,
  db
} from '../src/db.js';

const txHash = (char) => `0x${char.repeat(64)}`;

test('BotBounty Escrow Payments & Admin Distribution Tests', async (t) => {
  let createdBounty = null;
  let testSubmission = null;

  await t.test('verifies admin authorization only for configured emails and wallets', () => {
    assert.equal(isAdminUser('admin@example.com'), true);
    assert.equal(isAdminUser('ADMIN@EXAMPLE.COM'), true);
    assert.equal(isAdminUser('admin@example.com', '0x1111111111111111111111111111111111111111'), true);
    assert.equal(isAdminUser('', '0x1111111111111111111111111111111111111111'), true);
    assert.equal(isAdminUser('random_stranger@example.com'), false);
    assert.equal(isAdminUser('olajideabdulquadri22@gmail.com'), false);
    assert.equal(isAdminUser(''), false);
  });

  await t.test('refuses to create a bounty without an on-chain deposit transaction', () => {
    assert.throws(() => {
      createBountyRecord({
        title: 'Unfunded Bounty',
        category: 'DEV',
        amount: 100
      });
    }, /deposit transaction is required/i);
  });

  await t.test('creates bounty in Pending Review status and ignores client-controlled settlement fields', () => {
    createdBounty = createBountyRecord({
      title: 'Build Decentralized File Verification on BOT Chain',
      category: 'DEV',
      categoryName: 'Code & Apps',
      amount: 1750,
      description: 'Implement zero-knowledge hash verification on BOT Chain.',
      depositTx: txHash('a'),
      // These must all be ignored by the server-side record builder.
      status: 'Settled',
      paymentStatus: 'settled',
      escrowWallet: '0x9999999999999999999999999999999999999999',
      rewardDistribution: {
        type: 'tiered',
        winnerCount: 3,
        tiers: [
          { place: 1, amount: 1000, label: '1st Place' },
          { place: 2, amount: 500, label: '2nd Place' },
          { place: 3, amount: 250, label: '3rd Place' }
        ]
      },
      maintainer: '0x1111111111111111111111111111111111111111',
      maintainerName: 'BOT Security Guild',
      maintainerEmail: 'guild@botbounty.ai',
      deadlineDays: 7
    });

    assert.ok(createdBounty.id);
    assert.equal(createdBounty.title, 'Build Decentralized File Verification on BOT Chain');
    assert.equal(createdBounty.amount, 1750);
    assert.equal(createdBounty.depositTx, txHash('a'));
    assert.notEqual(createdBounty.escrowWallet, '0x9999999999999999999999999999999999999999');
    // Newly created bounties must enter 'Pending Review'
    assert.equal(createdBounty.status, 'Pending Review');
    assert.equal(createdBounty.paymentStatus, 'pending_review');
    assert.equal(createdBounty.rewardDistribution.type, 'tiered');
    assert.equal(createdBounty.rewardDistribution.winnerCount, 3);
  });

  await t.test('admin reviews and approves bounty to make it Open for creators', async () => {
    const { approveBountyRecord } = await import('../src/db.js');
    const approvedBounty = approveBountyRecord(createdBounty.id, 'admin@example.com');

    assert.equal(approvedBounty.id, createdBounty.id);
    assert.equal(approvedBounty.status, 'Open');
    assert.equal(approvedBounty.paymentStatus, 'funded');

    createdBounty = approvedBounty;
  });

  await t.test('strictly blocks submissions once challenge deadline has expired', () => {
    const expiredBounty = createBountyRecord({
      title: 'Expired Challenge Test',
      category: 'DEV',
      amount: 100,
      depositTx: txHash('b'),
      maintainer: '0x1111111111111111111111111111111111111111',
      maintainerEmail: 'guild@botbounty.ai',
      deadlineDays: 7
    });
    db.prepare(`UPDATE bounties SET status = 'Open', payment_status = 'funded', deadline = ? WHERE id = ?`)
      .run(Date.now() - 10_000, expiredBounty.id);

    assert.throws(() => {
      createBountySubmission({
        bountyId: expiredBounty.id,
        walletAddress: '0x3333333333333333333333333333333333333333',
        submissionUrl: 'https://github.com/late/submission'
      });
    }, /deadline/i);
  });

  await t.test('strictly prevents the bounty creator from participating in the bounty they created', () => {
    // Attempt participation using maintainer email
    assert.throws(() => {
      createBountySubmission({
        bountyId: createdBounty.id,
        creatorName: 'Maintainer Self',
        creatorEmail: createdBounty.maintainerEmail,
        walletAddress: '0x9999999999999999999999999999999999999999',
        submissionUrl: 'https://github.com/self/submission'
      });
    }, /cannot participate/i);

    // Attempt participation using maintainer wallet
    assert.throws(() => {
      createBountySubmission({
        bountyId: createdBounty.id,
        creatorName: 'Maintainer Self',
        creatorEmail: 'different@email.com',
        walletAddress: createdBounty.maintainer,
        submissionUrl: 'https://github.com/self/submission'
      });
    }, /cannot participate/i);
  });

  await t.test('allows multiple creators to participate in a challenge', () => {
    const creatorWallet = '0x2222222222222222222222222222222222222222';
    testSubmission = createBountySubmission({
      bountyId: createdBounty.id,
      creatorName: 'Amina Dev',
      creatorEmail: 'amina@botbounty.ai',
      walletAddress: creatorWallet,
      submissionUrl: 'https://github.com/amina-dev/botbounty-zk-verify',
      notes: 'Completed full verification smart contract and benchmark suite on BOT Chain.'
    });

    assert.ok(testSubmission.id.startsWith('sub_'));
    assert.equal(testSubmission.bountyId, createdBounty.id);
    assert.equal(testSubmission.walletAddress, creatorWallet.toLowerCase());

    const submissions = getBountySubmissions(createdBounty.id);
    assert.ok(submissions.length >= 1);
    assert.equal(submissions[0].submission_url, 'https://github.com/amina-dev/botbounty-zk-verify');

    // Bounty status remains Open while deadline is active so creators can participate
    const updated = getBountyById(createdBounty.id);
    assert.equal(updated.status, 'Open');
  });

  await t.test('strictly prevents duplicate submissions and allows revisions instead', () => {
    // 1. Same wallet and same email attempts second submission
    assert.throws(() => {
      createBountySubmission({
        bountyId: createdBounty.id,
        creatorName: 'Amina Dev',
        creatorEmail: 'amina@botbounty.ai',
        walletAddress: '0x2222222222222222222222222222222222222222',
        submissionUrl: 'https://github.com/amina-dev/another-attempt'
      });
    }, /already submitted.*edit your existing submission/i);

    // 2. Same wallet address (different email) attempts second submission
    assert.throws(() => {
      createBountySubmission({
        bountyId: createdBounty.id,
        creatorName: 'Amina Dev Alt',
        creatorEmail: 'amina_second_email@botbounty.ai',
        walletAddress: '0x2222222222222222222222222222222222222222',
        submissionUrl: 'https://github.com/amina-dev/second-attempt'
      });
    }, /already submitted.*edit your existing submission/i);

    // 3. Same email (different wallet address) attempts second submission
    assert.throws(() => {
      createBountySubmission({
        bountyId: createdBounty.id,
        creatorName: 'Amina Dev',
        creatorEmail: 'amina@botbounty.ai',
        walletAddress: '0x7777777777777777777777777777777777777777',
        submissionUrl: 'https://github.com/amina-dev/third-attempt'
      });
    }, /already submitted.*edit your existing submission/i);

    // 4. Updating the existing submission is allowed
    const revised = updateBountySubmission({
      bountyId: createdBounty.id,
      submissionId: testSubmission.id,
      submissionUrl: 'https://github.com/amina-dev/botbounty-zk-verify-v2',
      notes: 'Added optimization benchmarks and security audit fix',
      submitterEmail: 'amina@botbounty.ai',
      submitterWallet: '0x2222222222222222222222222222222222222222'
    });

    assert.equal(revised.revision_count, 2);
    assert.equal(revised.submission_url, 'https://github.com/amina-dev/botbounty-zk-verify-v2');

    // 5. Another completely different creator CAN submit
    const secondCreatorSub = createBountySubmission({
      bountyId: createdBounty.id,
      creatorName: 'Tariq Systems',
      creatorEmail: 'tariq@systems.io',
      walletAddress: '0x8888888888888888888888888888888888888888',
      submissionUrl: 'https://github.com/tariq/zk-bench'
    });
    assert.ok(secondCreatorSub.id.startsWith('sub_'));
  });

  await t.test('settlement requires an explicit submission and a valid on-chain transaction hash', () => {
    assert.throws(() => {
      disburseBountyReward({
        bountyId: createdBounty.id,
        submissionId: testSubmission.id,
        adminEmail: 'admin@example.com',
        customAmount: 1750
      });
    }, /settlement transaction hash/i);

    assert.throws(() => {
      disburseBountyReward({
        bountyId: createdBounty.id,
        submissionId: 'sub_does_not_exist',
        adminEmail: 'admin@example.com',
        txHash: txHash('c')
      });
    }, /submission not found/i);
  });

  await t.test('admin settles an explicit winning submission with a verified settlement hash', () => {
    const settlementHash = txHash('c');
    const disbResult = disburseBountyReward({
      bountyId: createdBounty.id,
      submissionId: testSubmission.id,
      adminEmail: 'admin@example.com',
      customAmount: 1750,
      txHash: settlementHash
    });

    assert.equal(disbResult.success, true);
    assert.equal(disbResult.amount, 1750);
    assert.equal(disbResult.txHash, settlementHash);
    assert.equal(disbResult.recipient, '0x2222222222222222222222222222222222222222');

    // Bounty should now be Settled
    const settledBounty = getBountyById(createdBounty.id);
    assert.equal(settledBounty.status, 'Settled');
    assert.equal(settledBounty.paymentStatus, 'settled');
    assert.equal(settledBounty.solver, '0x2222222222222222222222222222222222222222');
    assert.equal(settledBounty.settlementTx, settlementHash);

    // Re-using the same settlement hash must be rejected.
    assert.throws(() => {
      disburseBountyReward({
        bountyId: createdBounty.id,
        submissionId: testSubmission.id,
        adminEmail: 'admin@example.com',
        txHash: settlementHash
      });
    }, /already been settled/i);
  });

  await t.test('admin overview stats aggregates platform metrics accurately', () => {
    createUser({
      email: 'creator_stats_test@botbounty.ai',
      name: 'Stats Test Creator',
      username: 'statstest'
    });
    const stats = getAdminOverviewStats();
    assert.ok(stats.totalBounties >= 1);
    assert.ok(stats.totalEscrowedUsdc > 0);
    assert.ok(stats.totalSubmissions >= 1);
    assert.ok(stats.totalDistributedUsdc >= 1750);
    assert.ok(typeof stats.totalUsers === 'number');
    assert.ok(stats.totalUsers >= 1);
    const users = getAllUsers();
    assert.ok(Array.isArray(users));
    assert.equal(users.length, stats.totalUsers);
    assert.equal(stats.escrowWallet, process.env.ESCROW_CONTRACT_ADDRESS || process.env.ESCROW_WALLET_ADDRESS || '0xB128F2f442554B6517D779788F28F2EB2612164A');
  });

  await t.test('admin middleware rejects missing, invalid, and expired tokens and accepts active sessions', async () => {
    const { requireAdmin, activeAdminTokens } = await import('../src/routes/admin.js');

    let nextCalled = false;
    const req = { headers: {} };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.data = data;
        return this;
      }
    };

    // 1. Unauthenticated request without token
    requireAdmin(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);

    // 2. Request with invalid token
    req.headers.authorization = 'Bearer arc_adm_invalid_fake_token';
    requireAdmin(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);

    // 3. Request with an expired token
    const expiredToken = 'arc_adm_expired_token_xyz123';
    activeAdminTokens.set(expiredToken, {
      createdAt: Date.now() - 120_000,
      expiresAt: Date.now() - 60_000
    });
    req.headers.authorization = `Bearer ${expiredToken}`;
    nextCalled = false;
    requireAdmin(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    activeAdminTokens.delete(expiredToken);

    // 4. Request with a valid active admin session
    const testAdminToken = 'arc_adm_test_valid_token_xyz123';
    activeAdminTokens.set(testAdminToken, {
      email: 'admin@example.com',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000
    });

    req.headers.authorization = `Bearer ${testAdminToken}`;
    nextCalled = false;
    requireAdmin(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.role, 'admin');
    assert.equal(req.user.name, 'Master Administrator');

    // Clean up
    activeAdminTokens.delete(testAdminToken);
  });

  await t.test('calculates accurate user profile stats and leaderboard entries', () => {
    const winnerStats = getUserProfileStats(null, 'amina@botbounty.ai', '0x2222222222222222222222222222222222222222');
    assert.equal(winnerStats.submissionsCount, 1);
    assert.equal(winnerStats.winsCount, 1);
    assert.equal(winnerStats.totalEarnings, 1750);

    const emptyStats = getUserProfileStats(null, 'never_submitted@example.com', '0x9999999999999999999999999999999999999999');
    assert.equal(emptyStats.submissionsCount, 0);
    assert.equal(emptyStats.winsCount, 0);
    assert.equal(emptyStats.totalEarnings, 0);

    const leaderboard = getLeaderboard();
    assert.ok(Array.isArray(leaderboard));
    const winner = leaderboard.find((entry) => entry.address.toLowerCase() === '0x2222222222222222222222222222222222222222');
    assert.ok(winner, 'The settled solver must appear on the leaderboard');
    assert.equal(winner.earned, 1750);
    assert.equal(winner.completed, 1);
  });

  await t.test('syncs expired bounties to Closed status and attaches participants and submissions for review', () => {
    const syncTestBounty = createBountyRecord({
      title: 'UI Design for BOT Chain Explorer',
      category: 'DESIGN',
      amount: 600,
      depositTx: txHash('d'),
      maintainer: '0x1111111111111111111111111111111111111111',
      maintainerEmail: 'guild@botbounty.ai',
      deadlineDays: 1
    });
    // Approval is required before submissions are accepted.
    db.prepare(`UPDATE bounties SET status = 'Open', payment_status = 'funded' WHERE id = ?`).run(syncTestBounty.id);

    createBountySubmission({
      bountyId: syncTestBounty.id,
      creatorName: 'Designer Alice',
      creatorEmail: 'alice@design.io',
      walletAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      submissionUrl: 'https://figma.com/file/botchain-explorer',
      notes: 'Figma mockups for explorer'
    });

    createBountySubmission({
      bountyId: syncTestBounty.id,
      creatorName: 'Designer Bob',
      creatorEmail: 'bob@design.io',
      walletAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      submissionUrl: 'https://figma.com/file/botchain-mobile',
      notes: 'Mobile responsive variant'
    });

    // Simulate deadline expiration.
    db.prepare(`UPDATE bounties SET deadline = ? WHERE id = ?`).run(Date.now() - 5000, syncTestBounty.id);

    const closedBounties = getAllBounties({ status: 'Closed' });
    const foundClosed = closedBounties.find((b) => b.id === syncTestBounty.id);
    assert.ok(foundClosed, 'Expired bounty should appear in Closed query');
    assert.equal(foundClosed.status, 'Closed', 'Status must be synced to Closed');
    assert.equal(foundClosed.submissionsCount, 2, 'Submissions count must be 2');
    assert.equal(foundClosed.participantsCount, 2, 'Distinct participants count must be 2');
    assert.ok(Array.isArray(foundClosed.submissions), 'Submissions array must be attached');
    assert.ok(foundClosed.submissions.some((s) => s.submission_url === 'https://figma.com/file/botchain-mobile'));
    assert.ok(foundClosed.submissions.some((s) => s.submission_url === 'https://figma.com/file/botchain-explorer'));

    const openBounties = getAllBounties({ status: 'Open' });
    assert.equal(openBounties.find((b) => b.id === syncTestBounty.id), undefined);

    const adminStats = getAdminOverviewStats();
    assert.ok(adminStats.closedBounties >= 1, 'Admin overview stats must count closed bounties');
  });
});
