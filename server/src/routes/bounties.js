import express from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  getAllBounties,
  getBountyById,
  createBountyRecord,
  createBountySubmission,
  updateBountySubmission,
  disburseBountyReward,
  approveBountyRecord,
  getLeaderboard,
  getAllCreatorEmails,
  addBountyDiscussion,
  getBountyDiscussions,
  isValidEvmAddress,
  getAdminOverviewStats,
  db
} from '../db.js';
import {
  sendBountyApprovedNotification,
  sendNewBountyBroadcastToCreators
} from '../email.js';
import { getAdminIdentity } from './admin.js';
import { config } from '../config.js';
import {
  verifyDepositTransaction,
  verifySettlementTransaction,
  verifySubmissionTransaction,
  isValidTxHashFormat
} from '../services/onchainVerifier.js';
import { requireAuth, getSessionUser } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const bountyRouter = express.Router();

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAX_BOUNTY_AMOUNT = 1_000_000_000;
const ALLOWED_CATEGORIES = new Set([
  'CONTENT', 'CREATIVE', 'VIDEO', 'WRITING',
  'DESIGN', 'DEV', 'DEVELOPMENT', 'SOCIAL', 'MEMES', 'OTHER', 'RESEARCH'
]);

const createLimiter = rateLimit({ name: 'bounty-create', windowMs: 60 * 60_000, max: 10 });
const submitLimiter = rateLimit({ name: 'bounty-submit', windowMs: 60 * 60_000, max: 30 });
const commentLimiter = rateLimit({ name: 'bounty-comment', windowMs: 60_000, max: 20 });
const webhookLimiter = rateLimit({ name: 'bounty-webhook', windowMs: 60_000, max: 120 });

function isHttpUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (e) {
    return false;
  }
}

function parseAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function normalizeSettlementToken(value) {
  const token = String(value || ZERO_ADDRESS).trim().toLowerCase();
  if (token === ZERO_ADDRESS) return ZERO_ADDRESS;
  if (!config.enableErc20 || !isValidEvmAddress(token)) return null;
  return token;
}

/**
 * Bounty objects returned to non-admin callers never include sponsor email
 * addresses or raw participant submissions.
 */
function toPublicBounty(bounty, submissions = []) {
  if (!bounty) return null;
  const { maintainerEmail, submissions: _ignored, ...safe } = bounty;
  return {
    ...safe,
    submissionsCount: typeof bounty.submissionsCount === 'number'
      ? bounty.submissionsCount
      : (Array.isArray(bounty.submissions) ? bounty.submissions.length : 0),
    submissions
  };
}

function sanitizeCollaborators(collaborators) {
  if (collaborators === undefined || collaborators === null) return [];
  if (!Array.isArray(collaborators) || collaborators.length > 10) {
    throw new Error('Collaborators must be an array of at most 10 entries.');
  }

  return collaborators.map((entry) => {
    if (typeof entry === 'string') {
      return { name: entry.trim().slice(0, 80) };
    }
    if (!entry || typeof entry !== 'object') {
      throw new Error('Invalid collaborator entry.');
    }

    const address = entry.address ? String(entry.address).trim() : null;
    if (address && !isValidEvmAddress(address)) {
      throw new Error('Collaborator wallet addresses must be valid EVM addresses.');
    }

    const share = entry.share === undefined || entry.share === null ? null : Number(entry.share);
    if (share !== null && (!Number.isFinite(share) || share < 0 || share > 100)) {
      throw new Error('Collaborator shares must be between 0 and 100.');
    }

    return {
      address: address ? address.toLowerCase() : null,
      share,
      role: entry.role ? String(entry.role).trim().slice(0, 80) : null
    };
  });
}

function validateRewardDistribution(rewardDistribution, bountyAmount) {
  if (rewardDistribution === undefined || rewardDistribution === null) return null;
  if (typeof rewardDistribution !== 'object' || Array.isArray(rewardDistribution)) {
    throw new Error('Invalid reward distribution configuration.');
  }

  const type = String(rewardDistribution.type || 'single');
  if (!['single', 'tiered', 'equal'].includes(type)) {
    throw new Error('Invalid reward distribution type.');
  }

  const tiers = Array.isArray(rewardDistribution.tiers) ? rewardDistribution.tiers : [];
  if (tiers.length > 20) {
    throw new Error('At most 20 reward tiers are supported.');
  }

  let total = 0;
  const normalizedTiers = tiers.map((tier, index) => {
    const amount = Number(tier?.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error('Reward tier amounts must be non-negative numbers.');
    }
    total += amount;
    const place = Number.isInteger(Number(tier?.place)) ? Number(tier.place) : index + 1;
    return {
      place,
      label: String(tier?.label || `Winner #${place}`).slice(0, 60),
      amount
    };
  });

  const winnerCount = Number.isInteger(Number(rewardDistribution.winnerCount))
    ? Number(rewardDistribution.winnerCount)
    : Math.max(1, normalizedTiers.length || 1);

  if (winnerCount < 1 || winnerCount > 100) {
    throw new Error('Winner count must be between 1 and 100.');
  }

  if (total > bountyAmount + 0.0000001) {
    throw new Error('The sum of reward tiers cannot exceed the bounty amount.');
  }

  return { ...rewardDistribution, type, winnerCount, tiers: normalizedTiers };
}

/**
 * GET /api/bounties/escrow-wallet
 */
bountyRouter.get('/escrow-wallet', (req, res) => {
  const escrowWallet = config.escrowContractAddress;
  const supportedTokens = [
    { symbol: 'BOT', name: 'Native $BOT', address: ZERO_ADDRESS, decimals: 18 }
  ];
  if (config.enableErc20) {
    supportedTokens.unshift({ symbol: 'USDT', name: 'Bridged USDT (ERC-20)', address: config.usdtAddress, decimals: 6 });
  }
  res.json({
    success: true,
    escrowWallet,
    chainId: parseInt(process.env.BOT_CHAIN_ID || '677', 10),
    networkName: 'BOT Chain Mainnet',
    explorerUrl: 'https://scan.botchain.ai',
    websiteUrl: 'https://botchain.ai',
    token: config.enableErc20 ? 'USDT & Native $BOT' : 'Native $BOT',
    supportedTokens,
    tokenAddress: ZERO_ADDRESS,
    nativeOnly: !config.enableErc20
  });
});

/**
 * GET /api/bounties
 * Public feed. Admin callers receive raw submissions for review.
 */
bountyRouter.get('/', (req, res) => {
  try {
    const list = getAllBounties(req.query);
    const isAdmin = Boolean(getAdminIdentity(req));
    const sanitizedList = isAdmin ? list : list.map((bounty) => toPublicBounty(bounty));
    res.json({
      success: true,
      total: sanitizedList.length,
      bounties: sanitizedList
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/bounties/stats
 */
bountyRouter.get('/stats', (req, res) => {
  try {
    const adminStats = getAdminOverviewStats();
    res.json({
      success: true,
      stats: {
        tvlUsdc: adminStats.totalEscrowedUsdc,
        totalEscrowedUsdc: adminStats.totalEscrowedUsdc,
        totalSettledUsdc: adminStats.totalDistributedUsdc,
        totalDistributedUsdc: adminStats.totalDistributedUsdc,
        avgSettlementTimeMs: 384,
        activeBountiesCount: adminStats.openBounties + adminStats.inReviewBounties,
        totalBounties: adminStats.totalBounties,
        openBounties: adminStats.openBounties,
        inReviewBounties: adminStats.inReviewBounties,
        settledBounties: adminStats.settledBounties,
        totalSubmissions: adminStats.totalSubmissions,
        totalDistributions: adminStats.totalDistributions,
        totalUsers: adminStats.totalUsers,
        totalCreators: adminStats.totalCreators,
        escrowWallet: adminStats.escrowWallet
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/bounties/leaderboard
 */
bountyRouter.get('/leaderboard', (req, res) => {
  try {
    const creators = getLeaderboard();
    res.json({ success: true, creators });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/bounties/:id
 * Public data plus the authenticated user's own submission(s).
 */
bountyRouter.get('/:id', (req, res) => {
  try {
    const bounty = getBountyById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const adminIdentity = getAdminIdentity(req);
    const authUser = adminIdentity?.source === 'session' ? adminIdentity : getSessionUser(req);
    const allSubmissions = Array.isArray(bounty.submissions) ? bounty.submissions : [];

    let visibleSubmissions = [];
    if (adminIdentity) {
      visibleSubmissions = allSubmissions;
    } else if (authUser) {
      const uEmail = (authUser.email || '').trim().toLowerCase();
      const uWallet = (authUser.wallet_address || '').trim().toLowerCase();
      const uId = authUser.id;
      visibleSubmissions = allSubmissions.filter((submission) => {
        const sEmail = (submission.creator_email || '').trim().toLowerCase();
        const sWallet = (submission.wallet_address || '').trim().toLowerCase();
        const sCreatorId = submission.creator_id;
        return (uId && sCreatorId === uId) || (uEmail && sEmail === uEmail) || (uWallet && sWallet === uWallet);
      });
    }

    res.json({
      success: true,
      bounty: toPublicBounty(bounty, visibleSubmissions)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/bounties
 * Creates a bounty pending admin review. The maintainer identity is always
 * derived from the authenticated session and from the verified on-chain event.
 */
bountyRouter.post('/', requireAuth, createLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const amount = parseAmount(body.amount);
    const depositTx = typeof body.depositTx === 'string' ? body.depositTx.trim() : '';

    if (title.length < 5 || title.length > 200) {
      return res.status(400).json({ success: false, error: 'Title must be 5-200 characters.' });
    }
    if (!amount || amount > MAX_BOUNTY_AMOUNT) {
      return res.status(400).json({ success: false, error: 'A valid bounty amount is required.' });
    }
    if (!isValidTxHashFormat(depositTx)) {
      return res.status(400).json({
        success: false,
        error: 'A valid on-chain escrow deposit transaction hash (depositTx) is required.'
      });
    }
    if (!req.user.wallet_address || !isValidEvmAddress(req.user.wallet_address)) {
      return res.status(400).json({
        success: false,
        error: 'Connect and verify a payout wallet before creating a bounty.'
      });
    }

    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (description.length > 5000) {
      return res.status(400).json({ success: false, error: 'Description must be 5000 characters or fewer.' });
    }

    const category = String(body.category || 'CONTENT').toUpperCase();
    if (!ALLOWED_CATEGORIES.has(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category.' });
    }

    const categoryName = typeof body.categoryName === 'string'
      ? body.categoryName.trim().slice(0, 40)
      : 'Content';
    const categoryColor = /^#[0-9a-fA-F]{6}$/.test(String(body.categoryColor || ''))
      ? body.categoryColor
      : '#e9a13f';

    const deadlineDays = Number(body.deadlineDays);
    if (!Number.isInteger(deadlineDays) || deadlineDays < 1 || deadlineDays > 365) {
      return res.status(400).json({ success: false, error: 'Deadline must be between 1 and 365 days.' });
    }

    const settlementToken = normalizeSettlementToken(body.settlementToken);
    if (!settlementToken) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported settlement token. This release is native-$BOT-only.'
      });
    }

    const rewardDistribution = validateRewardDistribution(body.rewardDistribution, amount);

    const issueUrl = typeof body.issueUrl === 'string' ? body.issueUrl.trim() : '';
    if (issueUrl && !isHttpUrl(issueUrl)) {
      return res.status(400).json({ success: false, error: 'Issue URL must be a valid HTTP(S) URL.' });
    }

    const tags = Array.isArray(body.tags)
      ? body.tags.slice(0, 10).map((tag) => String(tag).trim().slice(0, 30)).filter(Boolean)
      : [];

    let verifiedDeposit;
    try {
      verifiedDeposit = await verifyDepositTransaction({
        txHash: depositTx,
        expectedAmount: amount,
        expectedToken: settlementToken,
        expectedMaintainer: req.user.wallet_address
      });
    } catch (verifErr) {
      return res.status(400).json({ success: false, error: verifErr.message });
    }

    // An on-chain escrow position can only back one platform bounty.
    const existingOnChain = db.prepare(`
      SELECT id FROM bounties
      WHERE LOWER(on_chain_bounty_id) = LOWER(?)
      LIMIT 1
    `).get(String(verifiedDeposit.bountyId));
    if (existingOnChain) {
      return res.status(409).json({
        success: false,
        error: 'This on-chain escrow position is already linked to another bounty.'
      });
    }

    const existingRecent = db.prepare(`
      SELECT id FROM bounties
      WHERE LOWER(TRIM(title)) = ? AND LOWER(COALESCE(maintainer_email, '')) = ? AND created_at > ?
      LIMIT 1
    `).get(title.toLowerCase(), (req.user.email || '').toLowerCase(), Date.now() - 30_000);

    if (existingRecent) {
      return res.status(200).json({
        success: true,
        message: 'Bounty already recorded',
        bounty: toPublicBounty(getBountyById(existingRecent.id))
      });
    }

    const newBounty = createBountyRecord({
      title,
      category,
      categoryName,
      categoryColor,
      submissionType: typeof body.submissionType === 'string' ? body.submissionType.slice(0, 100) : 'Deliverable URL',
      issueUrl: issueUrl || undefined,
      amount,
      tags,
      description,
      deadlineDays,
      rewardDistribution,
      depositTx,
      onChainBountyId: verifiedDeposit.bountyId,
      maintainer: req.user.wallet_address,
      maintainerName: req.user.name || 'BOT Ecosystem Sponsor',
      maintainerEmail: req.user.email
    });

    res.status(201).json({
      success: true,
      message: 'Bounty created and verified with on-chain Bohr escrow deposit',
      bounty: toPublicBounty(newBounty),
      verifiedDeposit: {
        verified: verifiedDeposit.verified,
        txHash: verifiedDeposit.txHash,
        bountyId: verifiedDeposit.bountyId,
        maintainer: verifiedDeposit.maintainer,
        amountWei: verifiedDeposit.amountWei
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function resolveSubmissionInput(req) {
  const body = req.body || {};
  return {
    submissionUrl: typeof body.submissionUrl === 'string'
      ? body.submissionUrl.trim()
      : (typeof body.prUrl === 'string' ? body.prUrl.trim() : ''),
    notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : null,
    solverType: typeof body.solverType === 'string' ? body.solverType.trim().slice(0, 60) : 'Human Creator',
    collaborators: body.collaborators,
    submitTx: typeof body.submitTx === 'string' ? body.submitTx.trim() : null,
    claimedWallet: body.walletAddress || body.solverAddress || null
  };
}

async function submitDeliverable(req, res) {
  try {
    const input = resolveSubmissionInput(req);
    const bounty = getBountyById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    if (!isHttpUrl(input.submissionUrl) || input.submissionUrl.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or junk submission URL. Provide a valid HTTP(S) deliverable link.'
      });
    }

    if (!req.user.wallet_address || !isValidEvmAddress(req.user.wallet_address)) {
      return res.status(400).json({
        success: false,
        error: 'Connect and verify a payout wallet before submitting a deliverable.'
      });
    }

    if (input.claimedWallet) {
      if (!isValidEvmAddress(input.claimedWallet) ||
          input.claimedWallet.toLowerCase() !== req.user.wallet_address.toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: 'Payout wallet must match the wallet verified on your account.'
        });
      }
    }

    const effectiveDeadline = bounty.deadline || (bounty.createdAt && bounty.deadlineDays
      ? bounty.createdAt + bounty.deadlineDays * 86400000
      : null);
    if (effectiveDeadline && Date.now() > effectiveDeadline) {
      return res.status(400).json({
        success: false,
        error: 'Challenge deadline has expired. Submissions are strictly closed.'
      });
    }

    if (bounty.status !== 'Open' && bounty.status !== 'InReview') {
      return res.status(400).json({
        success: false,
        error: `Submissions are closed. Challenge status is currently "${bounty.status}".`
      });
    }

    const submitterEmail = (req.user.email || '').trim().toLowerCase();
    const submitterWallet = req.user.wallet_address.trim().toLowerCase();
    const bountyCreatorEmail = (bounty.maintainerEmail || '').trim().toLowerCase();
    const bountyCreatorWallet = (bounty.maintainer || '').trim().toLowerCase();

    if (
      (bountyCreatorEmail && submitterEmail && bountyCreatorEmail === submitterEmail) ||
      (bountyCreatorWallet && submitterWallet && bountyCreatorWallet === submitterWallet)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Bounty creators cannot participate in or submit solutions to their own bounties.'
      });
    }

    if (input.submitTx) {
      if (!bounty.onChainBountyId) {
        return res.status(400).json({
          success: false,
          error: 'This bounty has no on-chain escrow record, so an on-chain submission cannot be verified.'
        });
      }
      try {
        await verifySubmissionTransaction({
          txHash: input.submitTx,
          expectedSolver: req.user.wallet_address,
          expectedBountyId: bounty.onChainBountyId
        });
      } catch (subErr) {
        return res.status(400).json({
          success: false,
          error: `On-chain submission transaction verification failed: ${subErr.message}`
        });
      }
    }

    const collaborators = sanitizeCollaborators(input.collaborators);
    const submission = createBountySubmission({
      bountyId: bounty.id,
      creatorId: req.user.id,
      creatorName: req.user.name || 'Anonymous Creator',
      creatorEmail: req.user.email,
      walletAddress: req.user.wallet_address,
      submissionUrl: input.submissionUrl,
      notes: input.notes,
      solverType: input.solverType || 'Human Creator',
      collaborators,
      submitTx: input.submitTx || null
    });

    const updatedBounty = getBountyById(bounty.id);

    res.json({
      success: true,
      message: 'Submission successfully recorded! Visible to challenge maintainer & admin.',
      submission,
      bounty: toPublicBounty(updatedBounty, [submission])
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/bounties/:id/participate
 */
bountyRouter.post('/:id/participate', requireAuth, submitLimiter, submitDeliverable);

/**
 * POST /api/bounties/:id/claim
 * Backwards-compatible alias with the same session-bound rules.
 */
bountyRouter.post('/:id/claim', requireAuth, submitLimiter, submitDeliverable);

/**
 * PUT /api/bounties/:id/submissions/:submissionId
 */
bountyRouter.put('/:id/submissions/:submissionId', (req, res) => {
  try {
    const adminIdentity = getAdminIdentity(req);
    const authUser = adminIdentity?.source === 'session' ? adminIdentity : getSessionUser(req);
    const isAdmin = Boolean(adminIdentity);

    if (!authUser && !isAdmin) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to modify this submission.'
      });
    }

    const { submissionUrl, notes, collaborators } = req.body || {};
    if (submissionUrl !== undefined && (!isHttpUrl(submissionUrl) || submissionUrl.length < 10)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or junk submission URL. Provide a valid HTTP(S) deliverable link.'
      });
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 2000)) {
      return res.status(400).json({ success: false, error: 'Notes must be 2000 characters or fewer.' });
    }

    const sanitizedCollaborators = collaborators === undefined
      ? undefined
      : sanitizeCollaborators(collaborators);

    const updated = updateBountySubmission({
      bountyId: req.params.id,
      submissionId: req.params.submissionId,
      submissionUrl,
      notes,
      collaborators: sanitizedCollaborators,
      submitterEmail: isAdmin ? null : authUser.email,
      submitterWallet: isAdmin ? null : authUser.wallet_address,
      isAdmin
    });

    res.json({
      success: true,
      message: 'Submission successfully updated with new revision history.',
      submission: updated
    });
  } catch (err) {
    const status = err.status || (err.message.includes('Unauthorized') ? 403 : 400);
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/bounties/:id/comments
 */
bountyRouter.get('/:id/comments', (req, res) => {
  try {
    const bounty = getBountyById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }
    const comments = getBountyDiscussions(bounty.id);
    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/bounties/:id/comments
 */
bountyRouter.post('/:id/comments', requireAuth, commentLimiter, (req, res) => {
  try {
    const { content } = req.body || {};
    if (typeof content !== 'string' || !content.trim() || content.trim().length > 2000) {
      return res.status(400).json({ success: false, error: 'Comment must be 1-2000 characters.' });
    }

    const adminIdentity = getAdminIdentity(req);
    const newComment = addBountyDiscussion({
      bountyId: req.params.id,
      userId: req.user.id,
      authorName: req.user.name || 'Community Member',
      authorHandle: req.user.username ? `@${req.user.username}` : null,
      authorRole: adminIdentity ? 'sponsor' : 'creator',
      authorAvatar: req.user.avatar || null,
      content
    });

    res.json({
      success: true,
      message: 'Comment published to challenge discussion.',
      comment: newComment
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

function verifyGithubSignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
  if (!secret) {
    return { ok: false, status: 503, error: 'GitHub webhook secret is not configured.' };
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature || typeof signature !== 'string' || !req.rawBody) {
    return { ok: false, status: 401, error: 'Missing GitHub webhook signature.' };
  }

  const expected = `sha256=${createHmac('sha256', secret).update(req.rawBody).digest('hex')}`;
  const suppliedBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return { ok: false, status: 401, error: 'Invalid GitHub webhook signature.' };
  }

  return { ok: true };
}

/**
 * POST /api/bounties/github-webhook
 * HMAC-verified GitHub integration. Unauthenticated events are rejected.
 */
bountyRouter.post('/github-webhook', webhookLimiter, (req, res) => {
  try {
    const signatureCheck = verifyGithubSignature(req);
    if (!signatureCheck.ok) {
      return res.status(signatureCheck.status).json({ success: false, error: signatureCheck.error });
    }

    const event = req.headers['x-github-event'] || 'pull_request';
    const payload = req.body || {};

    const expectedRepo = String(process.env.GITHUB_WEBHOOK_REPO || '').trim().toLowerCase();
    if (expectedRepo && String(payload.repository?.full_name || '').toLowerCase() !== expectedRepo) {
      return res.status(403).json({ success: false, error: 'Webhook repository is not allowed.' });
    }

    if (event === 'ping' || payload?.action === 'ping') {
      return res.json({ success: true, message: 'BotBounty GitHub Webhook alive and verified!' });
    }

    if (event === 'pull_request') {
      const action = payload.action;
      const pr = payload.pull_request;
      if (!pr) return res.status(400).json({ success: false, error: 'No pull_request payload' });

      const prTitle = typeof pr.title === 'string' ? pr.title : '';
      const prBody = typeof pr.body === 'string' ? pr.body : '';
      const prNumber = Number(pr.number);
      const isMerged = pr.merged === true;

      const match = (prTitle + ' ' + prBody).match(/bounty-(?:bot|arc)-[\w-]+/i);
      if (!match) {
        return res.json({ success: true, message: 'PR received, but no linked BotBounty ID found.' });
      }

      const bountyId = match[0].toLowerCase();
      const bounty = getBountyById(bountyId);
      if (!bounty) {
        return res.json({ success: true, message: `Bounty ${bountyId} not found in database.` });
      }

      if (action === 'opened' || action === 'synchronize') {
        if (!bounty.deadline || Date.now() >= bounty.deadline) {
          db.prepare(`UPDATE bounties SET status = 'InReview' WHERE id = ? AND status = 'Open'`).run(bounty.id);
        }
        return res.json({
          success: true,
          action: 'logged_pr',
          bountyId: bounty.id,
          message: `GitHub PR #${prNumber} logged for bounty ${bounty.id}`
        });
      }

      if (action === 'closed' && isMerged) {
        if (!Number.isInteger(prNumber) || prNumber <= 0) {
          return res.status(400).json({ success: false, error: 'Invalid pull request number.' });
        }

        const submissions = db.prepare(`SELECT id, submission_url FROM bounty_submissions WHERE bounty_id = ?`).all(bounty.id);
        let updated = 0;
        for (const submission of submissions) {
          try {
            const url = new URL(submission.submission_url);
            if (!/(^|\.)github\.com$/i.test(url.hostname)) continue;
            const expectedPath = `/pull/${prNumber}`;
            if (url.pathname.replace(/\/+$/, '').toLowerCase().endsWith(expectedPath)) {
              db.prepare(`UPDATE bounty_submissions SET github_pr_status = 'merged' WHERE id = ?`).run(submission.id);
              updated += 1;
            }
          } catch (e) {
            // Ignore malformed legacy URLs.
          }
        }

        return res.json({
          success: true,
          action: 'pr_merged',
          bountyId: bounty.id,
          updatedSubmissions: updated,
          message: `PR #${prNumber} merged. Matching submissions were flagged for review.`
        });
      }
    }

    return res.json({ success: true, message: 'Webhook processed.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/bounties/:id/approve
 */
bountyRouter.post('/:id/approve', async (req, res) => {
  try {
    const adminIdentity = getAdminIdentity(req);
    if (!adminIdentity) {
      return res.status(403).json({ success: false, error: 'Administrative privileges required to approve bounties.' });
    }

    const bounty = getBountyById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const updatedBounty = approveBountyRecord(bounty.id, adminIdentity.email);

    try {
      if (updatedBounty.maintainerEmail) {
        sendBountyApprovedNotification(updatedBounty.maintainerEmail, updatedBounty).catch(e => console.warn(e.message));
      }
      const creatorEmails = getAllCreatorEmails();
      if (creatorEmails && creatorEmails.length > 0) {
        sendNewBountyBroadcastToCreators(creatorEmails, updatedBounty).catch(e => console.warn(e.message));
      }
    } catch (e) {
      console.warn('Notification dispatch error:', e);
    }

    res.json({
      success: true,
      message: `Bounty "${updatedBounty.title}" approved and published live! Email notifications dispatched.`,
      bounty: updatedBounty
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/bounties/:id/release
 * Admin-only settlement recording. The explicit submissionId prevents the
 * server from silently paying whichever submission happens to sort first.
 */
bountyRouter.post('/:id/release', async (req, res) => {
  try {
    const adminIdentity = getAdminIdentity(req);
    if (!adminIdentity) {
      return res.status(403).json({
        success: false,
        error: 'Approval and disbursal strictly belong to the platform administrator.'
      });
    }

    const bounty = getBountyById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    if (bounty.status === 'Settled' || bounty.paymentStatus === 'settled') {
      return res.status(409).json({ success: false, error: 'This bounty has already been settled.' });
    }

    const submissionId = req.body?.submissionId;
    if (!submissionId) {
      return res.status(400).json({
        success: false,
        error: 'submissionId is required so the approved winner is explicit.'
      });
    }

    const winningSub = db.prepare('SELECT * FROM bounty_submissions WHERE id = ? AND bounty_id = ?')
      .get(submissionId, bounty.id);
    if (!winningSub) {
      return res.status(400).json({ success: false, error: 'The selected submission does not belong to this bounty.' });
    }
    if (winningSub.status === 'awarded' || Number(winningSub.reward_paid) > 0) {
      return res.status(409).json({ success: false, error: 'This submission has already been awarded.' });
    }

    const txHash = req.body?.settlementTx || req.body?.txHash;
    if (!txHash || !isValidTxHashFormat(txHash)) {
      return res.status(400).json({
        success: false,
        error: 'A valid wallet-signed on-chain settlement transaction hash (txHash) is required. The server never signs or relays releases.'
      });
    }

    if (!bounty.onChainBountyId) {
      return res.status(400).json({
        success: false,
        error: 'This bounty has no on-chain escrow record, so it cannot be settled.'
      });
    }

    const releaseAmount = req.body?.amount === undefined ? Number(bounty.amount) : Number(req.body.amount);
    if (!Number.isFinite(releaseAmount) || releaseAmount <= 0 || releaseAmount > Number(bounty.amount)) {
      return res.status(400).json({ success: false, error: 'Invalid release amount.' });
    }

    let verifiedSettlement;
    try {
      verifiedSettlement = await verifySettlementTransaction({
        txHash,
        expectedSolver: winningSub.wallet_address,
        expectedAmount: releaseAmount,
        expectedBountyId: bounty.onChainBountyId
      });
    } catch (verifErr) {
      return res.status(400).json({ success: false, error: verifErr.message });
    }

    const result = disburseBountyReward({
      bountyId: bounty.id,
      submissionId: winningSub.id,
      adminEmail: adminIdentity.email,
      customAmount: releaseAmount,
      txHash
    });

    const updatedBounty = getBountyById(bounty.id);

    res.json({
      success: true,
      message: 'Escrow reward disbursed to solver on Bohr Testnet',
      settlement: result,
      verifiedSettlement,
      bounty: updatedBounty
    });
  } catch (err) {
    const status = /already|reused|settled|awarded/i.test(err.message) ? 409 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
