import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { bountyRouter } from '../src/routes/bounties.js';
import { activeAdminTokens } from '../src/routes/admin.js';
import {
  createBountyRecord,
  createBountySubmission,
  createUser,
  createSession,
  getBountyById,
  approveBountyRecord
} from '../src/db.js';

test('BotBounty Submission Security & Ownership Verification Suite', async (t) => {
  // Set up ephemeral express app for route security testing
  const app = express();
  app.use(express.json());
  app.use('/api/bounties', bountyRouter);

  let server;
  let baseUrl;

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  // Seed test users
  const timestamp = Date.now();
  const maintainerUser = createUser({
    email: `maintainer_${timestamp}@bohr.network`,
    name: 'Maintainer Alice',
    username: `alice_${timestamp}`,
    discipline: 'Development'
  });

  const solverA = createUser({
    email: `solverA_${timestamp}@bohr.network`,
    name: 'Solver Alice',
    username: `solver_a_${timestamp}`,
    discipline: 'Smart Contracts'
  });
  const tokenA = createSession(solverA.id).token;

  const solverB = createUser({
    email: `solverB_${timestamp}@bohr.network`,
    name: 'Solver Bob',
    username: `solver_b_${timestamp}`,
    discipline: 'Frontend'
  });
  const tokenB = createSession(solverB.id).token;

  // Seed test bounty
  const bounty = createBountyRecord({
    title: `BOT Chain Protocol Security Bounty ${timestamp}`,
    category: 'DEV',
    categoryName: 'Code & Apps',
    amount: 1000,
    description: 'Implement secure commit-reveal solution submissions for autonomous agents.',
    escrowWallet: '0xB128F2f442554B6517D779788F28F2EB2612164A',
    depositTx: '0xcd6897b537b4d03db87a0202bd1d41fb3eb545a97076619ef08fd744787fc78c',
    maintainer: maintainerUser.wallet_address,
    maintainerName: maintainerUser.name,
    maintainerEmail: maintainerUser.email,
    deadlineDays: 14
  });
  approveBountyRecord(bounty.id, 'admin@botbounty.ai');

  // Seed submission from Solver A
  const submissionA = createBountySubmission({
    bountyId: bounty.id,
    creatorId: solverA.id,
    creatorName: solverA.name,
    creatorEmail: solverA.email,
    walletAddress: solverA.wallet_address,
    submissionUrl: 'https://github.com/Blackwrld04/BOTBOUNTY/pull/101',
    notes: 'Confidential architecture deliverable proof for Maintainer only.',
    solverType: 'Smart Contract Auditor'
  });

  await t.test('Negative: Unauthenticated request cannot view submissions', async () => {
    const res = await fetch(`${baseUrl}/api/bounties/${bounty.id}`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.bounty.submissionsCount >= 1, 'Total submission count must be visible');
    assert.equal(data.bounty.submissions.length, 0, 'Raw submissions must be empty for unauthenticated users');
  });

  await t.test('Negative: Spoofing ?email= in query parameters does NOT leak submissions', async () => {
    const res = await fetch(`${baseUrl}/api/bounties/${bounty.id}?email=${encodeURIComponent(solverA.email)}`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.bounty.submissions.length, 0, 'Query spoofing must be rejected without valid Bearer token');
  });

  await t.test('Negative: Spoofing x-user-email or x-wallet-address headers does NOT leak submissions', async () => {
    const res = await fetch(`${baseUrl}/api/bounties/${bounty.id}`, {
      headers: {
        'x-user-email': solverA.email,
        'x-wallet-address': solverA.wallet_address
      }
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.bounty.submissions.length, 0, 'Header spoofing must be rejected without valid Bearer token');
  });

  await t.test('Positive: Authenticated Solver A sees ONLY their own submission', async () => {
    const res = await fetch(`${baseUrl}/api/bounties/${bounty.id}`, {
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.bounty.submissions.length, 1);
    assert.equal(data.bounty.submissions[0].id, submissionA.id);
    assert.equal(data.bounty.submissions[0].creator_email, solverA.email);
  });

  await t.test('Negative: Authenticated Solver B cannot see Solver A submission', async () => {
    const res = await fetch(`${baseUrl}/api/bounties/${bounty.id}`, {
      headers: {
        Authorization: `Bearer ${tokenB}`
      }
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.bounty.submissions.length, 0, 'Solver B must not see Solver A confidential submission');
  });

  await t.test('Negative: Unauthenticated user cannot edit submission (401 Unauthorized)', async () => {
    const res = await fetch(`${baseUrl}/api/bounties/${bounty.id}/submissions/${submissionA.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionUrl: 'https://github.com/Blackwrld04/BOTBOUNTY/pull/evil',
        notes: 'Tampered notes'
      })
    });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.success, false);
    assert.ok(data.error.includes('Authentication required'));
  });

  await t.test('Negative: Authenticated Solver B cannot edit Solver A submission (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/bounties/${bounty.id}/submissions/${submissionA.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        submissionUrl: 'https://github.com/Blackwrld04/BOTBOUNTY/pull/tampered',
        notes: 'Unauthorized overwrite attempt'
      })
    });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.ok(data.error.includes('Unauthorized'));
  });

  await t.test('Negative: Attacker cannot spoof ownership via submitterEmail body payload', async () => {
    const res = await fetch(`${baseUrl}/api/bounties/${bounty.id}/submissions/${submissionA.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        submitterEmail: solverA.email,
        submitterWallet: solverA.wallet_address,
        submissionUrl: 'https://github.com/Blackwrld04/BOTBOUNTY/pull/spoofed'
      })
    });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.success, false);
  });

  await t.test('Positive: Authenticated Solver A can revise their own submission', async () => {
    const res = await fetch(`${baseUrl}/api/bounties/${bounty.id}/submissions/${submissionA.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        submissionUrl: 'https://github.com/Blackwrld04/BOTBOUNTY/pull/101-v2',
        notes: 'Updated implementation with gas optimizations'
      })
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.submission.submission_url, 'https://github.com/Blackwrld04/BOTBOUNTY/pull/101-v2');
    assert.ok(data.submission.revision_count >= 2);
  });

  await t.test('Negative: Junk submission URL (<10 chars) is rejected (400 Bad Request)', async () => {
    const res = await fetch(`${baseUrl}/api/bounties/${bounty.id}/participate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        submissionUrl: 'junk',
        walletAddress: solverB.wallet_address,
        notes: 'Low quality junk link'
      })
    });
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.ok(data.error.includes('junk'));
  });

  await t.test('Negative: Maintainer cannot solve own bounty (403 Forbidden)', async () => {
    const maintainerToken = createSession(maintainerUser.id, 86400000);
    const res = await fetch(`${baseUrl}/api/bounties/${bounty.id}/participate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${maintainerToken}`
      },
      body: JSON.stringify({
        submissionUrl: 'https://github.com/Blackwrld04/BOTBOUNTY/pull/self',
        walletAddress: maintainerUser.wallet_address,
        notes: 'Self-solve attempt'
      })
    });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.ok(data.error.includes('creators cannot participate'));
  });

  await t.test('Positive: Maintainer release dispatches settlement with real on-chain transaction hash', async () => {
    const realBohrTx = '0xc9c86fa10c4006cc5e76464785064e2d008bd6bc3d42953570b83f3c28a42dd7';
    const adminToken = 'admin_tok_' + timestamp;
    activeAdminTokens.set(adminToken, { email: 'olajideabdulquadri22@gmail.com' });

    const res = await fetch(`${baseUrl}/api/bounties/${bounty.id}/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        settlementTx: realBohrTx
      })
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.settlement.txHash, realBohrTx);

    const updated = getBountyById(bounty.id);
    assert.equal(updated.status, 'Settled');
    assert.equal(updated.settlementTx, realBohrTx);
  });
});
