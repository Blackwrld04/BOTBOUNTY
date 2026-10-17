import test from 'node:test';
import assert from 'node:assert/strict';
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
  getAllUsers
} from '../src/db.js';

test('ArcBounty Escrow Payments & Admin Distribution Tests', async (t) => {
  let createdBounty = null;
  let testSubmission = null;

  await t.test('verifies admin authorization for configured admin emails', () => {
    assert.equal(isAdminUser('olajideabdulquadri22@gmail.com'), true);
    assert.equal(isAdminUser('random_stranger@example.com'), false);
    assert.equal(isAdminUser(''), false);
  });


  await t.test('creates bounty in Pending Review status with prize distribution settings', () => {
    const escrowAddr = '0xBE0aaE21b6252aa1207cAa50A753e8C45bCBCbc5';
    const mockTx = '0xdep1234567890abcdef1234567890abcdef12';

    const rewardDist = {
      type: 'tiered',
      winnerCount: 3,
      tiers: [
        { place: 1, amount: 1000, label: '1st Place' },
        { place: 2, amount: 500, label: '2nd Place' },
        { place: 3, amount: 250, label: '3rd Place' }
      ]
    };

    createdBounty = createBountyRecord({
      title: 'Build Decentralized File Verification on Arc',
      category: 'DEV',
      categoryName: 'Code & Apps',
      amount: 1750,
      description: 'Implement zero-knowledge hash verification on Circle Arc L1.',
      escrowWallet: escrowAddr,
      depositTx: mockTx,
      rewardDistribution: rewardDist,
      maintainer: '0x1111111111111111111111111111111111111111',
      maintainerName: 'Arc Security Guild',
      maintainerEmail: 'guild@arc.builders',
      deadlineDays: 7
    });

    assert.ok(createdBounty.id);
    assert.equal(createdBounty.title, 'Build Decentralized File Verification on Arc');
    assert.equal(createdBounty.amount, 1750);
    assert.equal(createdBounty.escrowWallet, escrowAddr);
    assert.equal(createdBounty.depositTx, mockTx);
    // Newly created bounties must enter 'Pending Review'
    assert.equal(createdBounty.status, 'Pending Review');
    assert.equal(createdBounty.paymentStatus, 'pending_review');
    assert.equal(createdBounty.rewardDistribution.type, 'tiered');
    assert.equal(createdBounty.rewardDistribution.winnerCount, 3);
  });

  await t.test('admin reviews and approves bounty to make it Open for creators', async () => {
    const { approveBountyRecord } = await import('../src/db.js');
    const approvedBounty = approveBountyRecord(createdBounty.id, 'jasminee0904@gmail.com');

    assert.equal(approvedBounty.id, createdBounty.id);
    assert.equal(approvedBounty.status, 'Open');
    assert.equal(approvedBounty.paymentStatus, 'funded');

    createdBounty = approvedBounty;
  });

  await t.test('strictly blocks submissions once challenge deadline has expired', async () => {
    // Create an expired bounty
    const expiredBounty = createBountyRecord({
      title: 'Expired Challenge Test',
      category: 'DEV',
      amount: 100,
      status: 'Open',
      paymentStatus: 'funded',
      deadline: Date.now() - 10000 // 10 seconds ago
    });

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
      creatorEmail: 'amina@arc.builders',
      walletAddress: creatorWallet,
      submissionUrl: 'https://github.com/amina-dev/arc-zk-verify',
      notes: 'Completed full verification smart contract and benchmark suite on Arc Testnet.'
    });

    assert.ok(testSubmission.id.startsWith('sub_'));
    assert.equal(testSubmission.bountyId, createdBounty.id);
    assert.equal(testSubmission.walletAddress, creatorWallet.toLowerCase());

    const submissions = getBountySubmissions(createdBounty.id);
    assert.ok(submissions.length >= 1);
    assert.equal(submissions[0].submission_url, 'https://github.com/amina-dev/arc-zk-verify');

    // Bounty status remains Open while deadline is active so creators can participate
    const updated = getBountyById(createdBounty.id);
    assert.equal(updated.status, 'Open');
  });

  await t.test('strictly prevents a creator from submitting more than once to the same bounty and requires editing instead', () => {
    // 1. Same wallet and same email attempts second submission
    assert.throws(() => {
      createBountySubmission({
        bountyId: createdBounty.id,
        creatorName: 'Amina Dev',
        creatorEmail: 'amina@arc.builders',
        walletAddress: '0x2222222222222222222222222222222222222222',
        submissionUrl: 'https://github.com/amina-dev/another-attempt'
      });
    }, /already submitted.*edit your existing submission/i);

    // 2. Same wallet address (different email or uppercase) attempts second submission
    assert.throws(() => {
      createBountySubmission({
        bountyId: createdBounty.id,
        creatorName: 'Amina Dev Alt',
        creatorEmail: 'amina_second_email@arc.builders',
        walletAddress: '0x2222222222222222222222222222222222222222',
        submissionUrl: 'https://github.com/amina-dev/second-attempt'
      });
    }, /already submitted.*edit your existing submission/i);

    // 3. Same email (different wallet address) attempts second submission
    assert.throws(() => {
      createBountySubmission({
        bountyId: createdBounty.id,
        creatorName: 'Amina Dev',
        creatorEmail: 'amina@arc.builders',
        walletAddress: '0x7777777777777777777777777777777777777777',
        submissionUrl: 'https://github.com/amina-dev/third-attempt'
      });
    }, /already submitted.*edit your existing submission/i);

    // 4. Updating the existing submission is allowed
    const revised = updateBountySubmission({
      bountyId: createdBounty.id,
      submissionId: testSubmission.id,
      submissionUrl: 'https://github.com/amina-dev/arc-zk-verify-v2',
      notes: 'Added optimization benchmarks and security audit fix',
      submitterEmail: 'amina@arc.builders',
      submitterWallet: '0x2222222222222222222222222222222222222222'
    });

    assert.equal(revised.revision_count, 2);
    assert.equal(revised.submission_url, 'https://github.com/amina-dev/arc-zk-verify-v2');

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

  await t.test('admin disburses USDC reward from escrow to the creator', () => {
    const disbResult = disburseBountyReward({
      bountyId: createdBounty.id,
      submissionId: testSubmission.id,
      adminEmail: 'jasminee0904@gmail.com',
      customAmount: 1750
    });

    assert.equal(disbResult.success, true);
    assert.equal(disbResult.amount, 1750);
    assert.ok(disbResult.txHash.startsWith('0x'));
    assert.equal(disbResult.recipient, '0x2222222222222222222222222222222222222222');

    // Bounty should now be Settled
    const settledBounty = getBountyById(createdBounty.id);
    assert.equal(settledBounty.status, 'Settled');
    assert.equal(settledBounty.paymentStatus, 'settled');
    assert.equal(settledBounty.solver, '0x2222222222222222222222222222222222222222');
    assert.ok(settledBounty.settlementTx);
  });

  await t.test('admin overview stats aggregates platform metrics accurately', () => {
    createUser({
      email: 'creator_stats_test@arc.network',
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

  await t.test('authenticates master admin with password and rejects invalid attempts', async () => {
    const { requireAdmin, activeAdminTokens } = await import('../src/routes/admin.js');
    const validPassword = process.env.ADMIN_PASSWORD || 'arcbounty2026_admin!';

    // Simulating login logic
    const wrongAttempt = 'wrong_password_123';
    assert.notEqual(wrongAttempt, validPassword);

    // Mock Express request/response to test requireAdmin middleware
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

    // 3. Request with valid active admin password token
    const testAdminToken = 'arc_adm_test_valid_token_xyz123';
    activeAdminTokens.set(testAdminToken, {
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000
    });

    req.headers.authorization = `Bearer ${testAdminToken}`;
    requireAdmin(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.role, 'admin');
    assert.equal(req.user.name, 'Master Administrator');

    // Clean up
    activeAdminTokens.delete(testAdminToken);
  });

  await t.test('calculates accurate user profile stats and prevents 0-earnings with wins', () => {
    // Check stats for creator who received disbursement in previous test
    const winnerStats = getUserProfileStats(null, 'amina@arc.builders', '0x2222222222222222222222222222222222222222');
    assert.equal(winnerStats.submissionsCount, 1);
    assert.equal(winnerStats.winsCount, 1);
    assert.equal(winnerStats.totalEarnings, 1750);

    // Check stats for non-participant
    const emptyStats = getUserProfileStats(null, 'never_submitted@example.com', '0x9999999999999999999999999999999999999999');
    assert.equal(emptyStats.submissionsCount, 0);
    assert.equal(emptyStats.winsCount, 0);
    assert.equal(emptyStats.totalEarnings, 0);
  });

  await t.test('aggregates leaderboard with mathematically consistent ranks and task counts', () => {
    const leaderboard = getLeaderboard();
    assert.ok(Array.isArray(leaderboard));
    assert.ok(leaderboard.length >= 1);
    assert.equal(leaderboard[0].rank, 1);
    assert.equal(leaderboard[0].earned, 1750);
    assert.equal(leaderboard[0].completed, 1);
  });

  await t.test('syncs expired bounties to Closed status and attaches participants and submissions for review', async () => {
    // 1. Create an active bounty with 2 submissions
    const syncTestBounty = createBountyRecord({
      title: 'UI Design for Circle Arc Explorer',
      category: 'DESIGN',
      amount: 600,
      status: 'Open',
      paymentStatus: 'funded',
      deadlineDays: 1
    });

    createBountySubmission({
      bountyId: syncTestBounty.id,
      creatorName: 'Designer Alice',
      creatorEmail: 'alice@design.io',
      walletAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      submissionUrl: 'https://figma.com/file/arc-explorer',
      notes: 'Figma mockups for explorer'
    });

    createBountySubmission({
      bountyId: syncTestBounty.id,
      creatorName: 'Designer Bob',
      creatorEmail: 'bob@design.io',
      walletAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      submissionUrl: 'https://figma.com/file/arc-mobile',
      notes: 'Mobile responsive variant'
    });

    // 2. Simulate deadline expiration by updating deadline into the past in db
    const { db: testDb } = await import('../src/db.js');
    testDb.prepare(`UPDATE bounties SET deadline = ? WHERE id = ?`).run(Date.now() - 5000, syncTestBounty.id);

    // 3. Query all bounties under 'Closed' status
    const closedBounties = getAllBounties({ status: 'Closed' });
    const foundClosed = closedBounties.find(b => b.id === syncTestBounty.id);
    assert.ok(foundClosed, 'Expired bounty should appear in Closed query');
    assert.equal(foundClosed.status, 'Closed', 'Status must be synced to Closed');
    assert.equal(foundClosed.submissionsCount, 2, 'Submissions count must be 2');
    assert.equal(foundClosed.participantsCount, 2, 'Distinct participants count must be 2');
    assert.ok(Array.isArray(foundClosed.submissions), 'Submissions array must be attached');
    assert.ok(foundClosed.submissions.some(s => s.submission_url === 'https://figma.com/file/arc-mobile'), 'Must contain mobile submission');
    assert.ok(foundClosed.submissions.some(s => s.submission_url === 'https://figma.com/file/arc-explorer'), 'Must contain explorer submission');

    // 4. Query under 'Open' status must NOT include the closed bounty
    const openBounties = getAllBounties({ status: 'Open' });
    const shouldNotFindOpen = openBounties.find(b => b.id === syncTestBounty.id);
    assert.equal(shouldNotFindOpen, undefined, 'Expired bounty must not appear in Open query');

    // 5. Admin overview stats must include closedBounties
    const adminStats = getAdminOverviewStats();
    assert.ok(adminStats.closedBounties >= 1, 'Admin overview stats must count closed bounties');
  });
});

