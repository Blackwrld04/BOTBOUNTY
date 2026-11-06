import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBountyRecord,
  approveBountyRecord,
  createBountySubmission,
  updateBountySubmission,
  getBountySubmissions,
  scoreBountySubmission,
  disburseBountyReward,
  addBountyDiscussion,
  getBountyDiscussions,
  scanArcEscrowDeposits,
  getAuditLedgerData
} from '../src/db.js';

const txHash = (char) => `0x${char.repeat(64)}`;

describe('BotBounty Integrated Features Tests', () => {
  const bounty = createBountyRecord({
    title: 'Integrated Features Test Bounty',
    category: 'DEV',
    amount: 3000,
    depositTx: txHash('a'),
    maintainer: '0x1111111111111111111111111111111111111111',
    maintainerName: 'BOT Chain Foundation',
    maintainerEmail: 'sponsor@botbounty.ai',
    deadlineDays: 7
  });
  approveBountyRecord(bounty.id);

  it('records a submission with co-creator collaboration and allows revision before deadline', () => {
    const sub = createBountySubmission({
      bountyId: bounty.id,
      creatorName: 'Lead Contributor',
      creatorEmail: 'lead@botbounty.dev',
      walletAddress: '0x2222222222222222222222222222222222222222',
      submissionUrl: 'https://github.com/lead/project/pull/1',
      notes: 'Initial release version 1',
      collaborators: [
        { address: '0x3333333333333333333333333333333333333333', share: 40, role: 'UI Designer' }
      ]
    });

    assert.equal(sub.revisionCount, 1);
    assert.equal(sub.collaborators.length, 1);
    assert.equal(sub.collaborators[0].share, 40);

    const updated = updateBountySubmission({
      bountyId: bounty.id,
      submissionId: sub.id,
      submissionUrl: 'https://github.com/lead/project/pull/1-revised',
      notes: 'Revised version 2 with security enhancements',
      submitterEmail: 'lead@botbounty.dev',
      submitterWallet: '0x2222222222222222222222222222222222222222',
      collaborators: [
        { address: '0x3333333333333333333333333333333333333333', share: 50, role: 'Co-Founder' }
      ]
    });

    assert.equal(updated.revisionCount, 2);
    assert.equal(updated.submissionUrl, 'https://github.com/lead/project/pull/1-revised');
    assert.equal(updated.collaborators[0].share, 50);

    const allSubs = getBountySubmissions(bounty.id);
    const foundSub = allSubs.find((s) => s.id === sub.id);
    assert.ok(foundSub);
    assert.equal(foundSub.revision_history.length, 1);
    assert.equal(foundSub.revision_history[0].submissionUrl, 'https://github.com/lead/project/pull/1');
  });

  it('enables public community discussion / Q&A under the bounty', () => {
    const comment1 = addBountyDiscussion({
      bountyId: bounty.id,
      authorName: 'Curious Builder',
      authorHandle: '@builder_bob',
      authorRole: 'creator',
      content: 'Is TypeScript strict mode required for this challenge?'
    });

    assert.ok(comment1.id);
    assert.equal(comment1.bountyId, bounty.id);

    addBountyDiscussion({
      bountyId: bounty.id,
      authorName: 'BOT Chain Sponsor',
      authorHandle: '@bot_official',
      authorRole: 'sponsor',
      content: 'Yes! Strict null checks and 100% type coverage are expected.'
    });

    const thread = getBountyDiscussions(bounty.id);
    assert.equal(thread.length, 2);
    assert.equal(thread[0].content, 'Is TypeScript strict mode required for this challenge?');
    assert.equal(thread[1].author_role, 'sponsor');
  });

  it('lists pending escrow deposits for administrator review', () => {
    const scan = scanArcEscrowDeposits();
    assert.equal(scan.success, true);
    assert.ok(Array.isArray(scan.verifiedDeposits));
  });

  it('records structured rubric scores and settles the explicit winner with a verified hash', () => {
    const sub2 = createBountySubmission({
      bountyId: bounty.id,
      creatorName: 'Second Builder',
      creatorEmail: 'second@botbounty.dev',
      walletAddress: '0x4444444444444444444444444444444444444444',
      submissionUrl: 'https://github.com/second/repo/pull/2',
      notes: 'Runner up submission'
    });

    const subs = getBountySubmissions(bounty.id);
    const sub1 = subs.find((s) => s.creator_email === 'lead@botbounty.dev');

    scoreBountySubmission({
      submissionId: sub1.id,
      scoreCodeQuality: 9,
      scoreCreativity: 8,
      scoreCompleteness: 10,
      reviewerNotes: 'Exceptional architecture and sub-second test execution.'
    });

    scoreBountySubmission({
      submissionId: sub2.id,
      scoreCodeQuality: 8,
      scoreCreativity: 9,
      scoreCompleteness: 8,
      reviewerNotes: 'Solid UX and creative presentation.'
    });

    const refreshedSubs = getBountySubmissions(bounty.id);
    const scoredSub1 = refreshedSubs.find((s) => s.id === sub1.id);
    assert.equal(scoredSub1.score_code_quality, 9);
    assert.equal(scoredSub1.reviewer_notes, 'Exceptional architecture and sub-second test execution.');

    // Settlement must name the winner and provide a verifiable on-chain hash.
    assert.throws(() => {
      disburseBountyReward({
        bountyId: bounty.id,
        submissionId: sub1.id,
        adminEmail: 'treasury@botbounty.io',
        customAmount: 2000
      });
    }, /settlement transaction hash/i);

    const settlementHash = txHash('b');
    const payoutResult = disburseBountyReward({
      bountyId: bounty.id,
      submissionId: sub1.id,
      adminEmail: 'treasury@botbounty.io',
      customAmount: 2000,
      txHash: settlementHash
    });

    assert.equal(payoutResult.success, true);
    assert.equal(payoutResult.amount, 2000);
    assert.equal(payoutResult.txHash, settlementHash);
    assert.equal(payoutResult.recipient, '0x2222222222222222222222222222222222222222');
  });

  it('generates exportable audit ledger data for DAO compliance', () => {
    const ledger = getAuditLedgerData();
    assert.ok(Array.isArray(ledger));
    const entry = ledger.find((row) => row.bounty_id === bounty.id);
    assert.ok(entry, 'Audit ledger should contain the settled disbursement');
    assert.equal(entry.tx_hash, txHash('b'));
    assert.equal(entry.amount_usdc, 2000);
  });
});
