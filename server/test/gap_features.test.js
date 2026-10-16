import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBountyRecord,
  approveBountyRecord,
  createBountySubmission,
  updateBountySubmission,
  getBountySubmissions,
  scoreBountySubmission,
  disburseMultiWinnerRewards,
  addBountyDiscussion,
  getBountyDiscussions,
  scanArcEscrowDeposits,
  getAuditLedgerData
} from '../src/db.js';

describe('ArcBounty Integrated Gap Features Tests', () => {
  const bountyId = 'bounty-gap-test-' + Date.now();

  const bounty = createBountyRecord({
    id: bountyId,
    title: 'Integrated Gaps Test Bounty',
    category: 'DEV',
    amount: 3000,
    maintainer: '0x1111111111111111111111111111111111111111',
    maintainerName: 'Circle Arc Foundation',
    maintainerEmail: 'sponsor@arc.network',
    deadlineDays: 7
  });
  approveBountyRecord(bounty.id);

  it('Gap 1 & 2: records submission with co-creator collaboration and allows revision before deadline', () => {
    // 1. Submit with co-creator split
    const sub = createBountySubmission({
      bountyId: bounty.id,
      creatorName: 'Lead Contributor',
      creatorEmail: 'lead@arc.dev',
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

    // 2. Creator revises their submission before deadline
    const updated = updateBountySubmission({
      bountyId: bounty.id,
      submissionId: sub.id,
      submissionUrl: 'https://github.com/lead/project/pull/1-revised',
      notes: 'Revised version 2 with security enhancements',
      submitterEmail: 'lead@arc.dev',
      submitterWallet: '0x2222222222222222222222222222222222222222',
      collaborators: [
        { address: '0x3333333333333333333333333333333333333333', share: 50, role: 'Co-Founder' }
      ]
    });

    assert.equal(updated.revisionCount, 2);
    assert.equal(updated.submissionUrl, 'https://github.com/lead/project/pull/1-revised');
    assert.equal(updated.collaborators[0].share, 50);

    // 3. Inspect submissions and history
    const allSubs = getBountySubmissions(bounty.id);
    const foundSub = allSubs.find(s => s.id === sub.id);
    assert.ok(foundSub);
    assert.equal(foundSub.revision_history.length, 1);
    assert.equal(foundSub.revision_history[0].submissionUrl, 'https://github.com/lead/project/pull/1');
  });

  it('Gap 3: enables public community discussion / Q&A under the bounty', () => {
    const comment1 = addBountyDiscussion({
      bountyId: bounty.id,
      authorName: 'Curious Builder',
      authorHandle: '@builder_bob',
      authorRole: 'creator',
      content: 'Is TypeScript strict mode required for this challenge?'
    });

    assert.ok(comment1.id);
    assert.equal(comment1.bountyId, bounty.id);

    const comment2 = addBountyDiscussion({
      bountyId: bounty.id,
      authorName: 'Circle Arc Sponsor',
      authorHandle: '@arc_official',
      authorRole: 'sponsor',
      content: 'Yes! Strict null checks and 100% type coverage are expected.'
    });

    const thread = getBountyDiscussions(bounty.id);
    assert.equal(thread.length, 2);
    assert.equal(thread[0].content, 'Is TypeScript strict mode required for this challenge?');
    assert.equal(thread[1].author_role, 'sponsor');
  });

  it('Gap 4: auto-detects incoming Arc Escrow deposits', () => {
    const scan = scanArcEscrowDeposits();
    assert.equal(scan.success, true);
    assert.ok(Array.isArray(scan.verifiedDeposits));
  });

  it('Gap 5: records structured rubric scores and distributes multi-winner tiered prizes', () => {
    // Submit 2nd participant
    const sub2 = createBountySubmission({
      bountyId: bounty.id,
      creatorName: 'Second Builder',
      creatorEmail: 'second@arc.dev',
      walletAddress: '0x4444444444444444444444444444444444444444',
      submissionUrl: 'https://github.com/second/repo/pull/2',
      notes: 'Runner up submission'
    });

    const subs = getBountySubmissions(bounty.id);
    const sub1 = subs[1]; // First submission

    // Score both submissions with rubrics
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

    // Verify scores stored
    const refreshedSubs = getBountySubmissions(bounty.id);
    const scoredSub1 = refreshedSubs.find(s => s.id === sub1.id);
    assert.equal(scoredSub1.score_code_quality, 9);
    assert.equal(scoredSub1.reviewer_notes, 'Exceptional architecture and sub-second test execution.');

    // Execute Multi-Winner Payout: 1st Place = $2000, 2nd Place = $1000
    const payoutResult = disburseMultiWinnerRewards({
      bountyId: bounty.id,
      winners: [
        { submissionId: sub1.id, rank: 1, amount: 2000 },
        { submissionId: sub2.id, rank: 2, amount: 1000 }
      ],
      adminEmail: 'treasury@arcbounty.io'
    });

    assert.equal(payoutResult.success, true);
    assert.equal(payoutResult.winners.length, 2);
    assert.equal(payoutResult.winners[0].amount, 2000);
    assert.equal(payoutResult.winners[1].amount, 1000);
  });

  it('Gap 7: generates exportable audit ledger data for DAO compliance', () => {
    const ledger = getAuditLedgerData();
    assert.ok(Array.isArray(ledger));
    assert.ok(ledger.length >= 2, 'Audit ledger should contain the multi-winner disbursements');
    assert.ok(ledger[0].tx_hash.startsWith('0x'));
  });
});
