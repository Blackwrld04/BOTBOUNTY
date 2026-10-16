import express from 'express';
import {
  getAllBounties,
  getBountyById,
  createBountyRecord,
  createBountySubmission,
  updateBountySubmission,
  disburseBountyReward,
  approveBountyRecord,
  rejectBountyRecord,
  getUserByToken,
  isAdminUser,
  getAdminOverviewStats,
  parseBountyRecord,
  getLeaderboard,
  getAllCreatorEmails,
  addBountyDiscussion,
  getBountyDiscussions,
  db
} from '../db.js';
import {
  sendBountyApprovedNotification,
  sendNewBountyBroadcastToCreators
} from '../email.js';
import { activeAdminTokens } from './admin.js';
import { config } from '../config.js';

export const bountyRouter = express.Router();

/**
 * GET /api/bounties/escrow-wallet
 * Retrieve platform escrow wallet address and chain metadata for deposit
 */
bountyRouter.get('/escrow-wallet', (req, res) => {
  const escrowWallet = process.env.ESCROW_WALLET_ADDRESS || '0x8b415aE3956992b0cbC6C78c485A4d099F6331cE';
  res.json({
    success: true,
    escrowWallet: config.escrowContractAddress || '0x909661b453bBe13Ee247551754b35370557A9aA2',
    chainId: parseInt(process.env.BOT_CHAIN_ID || '968', 10),
    networkName: 'BOT Chain (Bohr Testnet)',
    token: 'Bridged USDT',
    tokenAddress: config.usdtAddress || '0x75edC9335175Fc0552D51D48439F229c10420fe3'
  });
});

/**
 * GET /api/bounties
 * List bounties with filtering (persisted in SQLite)
 */
bountyRouter.get('/', (req, res) => {
  try {
    const list = getAllBounties(req.query);
    const authHeader = req.headers.authorization;
    let isAdmin = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (activeAdminTokens.has(token)) {
        isAdmin = true;
      } else {
        const authUser = getUserByToken(token);
        if (authUser && isAdminUser(authUser.email, authUser.wallet_address)) {
          isAdmin = true;
        }
      }
    }
    // Blind submission privacy: non-admin feed hides raw submissions array
    const sanitizedList = isAdmin ? list : list.map(b => ({
      ...b,
      submissions: []
    }));
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
 * Overview metrics synchronized with Admin Dashboard
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
 * Returns real creator rankings based on settled platform disbursements
 */
bountyRouter.get('/leaderboard', (req, res) => {
  try {
    const creators = getLeaderboard();
    res.json({
      success: true,
      creators
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/bounties/:id
 * Retrieve specific bounty by ID or hash.
 * Enforces blind submission privacy: regular participants see submission count
 * and only their own submission (if authenticated). Admin sees all submissions.
 */
bountyRouter.get('/:id', (req, res) => {
  try {
    const bounty = getBountyById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const authHeader = req.headers.authorization;
    let authUser = null;
    let isAdmin = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (activeAdminTokens.has(token)) {
        isAdmin = true;
      } else {
        authUser = getUserByToken(token);
        if (authUser && isAdminUser(authUser.email, authUser.wallet_address)) {
          isAdmin = true;
        }
      }
    }

    const allSubmissions = Array.isArray(bounty.submissions) ? bounty.submissions : [];
    const submissionsCount = typeof bounty.submissionsCount === 'number' ? bounty.submissionsCount : allSubmissions.length;

    // Blind submission privacy: unauthenticated users never receive raw submissions;
    // authenticated users only receive their own submission; admin sees all.
    let filteredSubmissions = [];
    if (isAdmin) {
      filteredSubmissions = allSubmissions;
    } else if (authUser) {
      const uEmail = (authUser.email || '').trim().toLowerCase();
      const uWallet = (authUser.wallet_address || '').trim().toLowerCase();
      const uId = authUser.id;
      filteredSubmissions = allSubmissions.filter((s) => {
        const sEmail = (s.creator_email || '').trim().toLowerCase();
        const sWallet = (s.wallet_address || '').trim().toLowerCase();
        const sCreatorId = s.creator_id;
        return (uId && sCreatorId === uId) || (uEmail && sEmail === uEmail) || (uWallet && sWallet === uWallet);
      });
    }

    res.json({
      success: true,
      bounty: {
        ...bounty,
        submissionsCount,
        submissions: filteredSubmissions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/bounties
 * Create a new bounty with verified escrow deposit instructions
 */
bountyRouter.post('/', (req, res) => {
  try {
    const { title, amount, rewardDistribution } = req.body;
    if (!title || !amount) {
      return res.status(400).json({ success: false, error: 'Title and amount are required' });
    }

    // Optional auth token to link maintainer email
    const authHeader = req.headers.authorization;
    let maintainerEmail = req.body.maintainerEmail;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const user = getUserByToken(authHeader.split(' ')[1]);
      if (user) {
        maintainerEmail = maintainerEmail || user.email;
      }
    }

    // Guard against rapid duplicate bounty creation
    const existingRecent = db.prepare(`
      SELECT * FROM bounties
      WHERE LOWER(TRIM(title)) = ? AND created_at > ?
      LIMIT 1
    `).get(title.trim().toLowerCase(), Date.now() - 30000);

    if (existingRecent) {
      return res.status(200).json({
        success: true,
        message: 'Bounty already recorded',
        bounty: parseBountyRecord(existingRecent)
      });
    }

    const newBounty = createBountyRecord({
      ...req.body,
      rewardDistribution,
      maintainerEmail
    });

    res.status(201).json({
      success: true,
      message: 'Bounty created and queued for Admin review & Arc Escrow verification',
      bounty: newBounty
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/bounties/:id/participate
 * Submit a deliverable to participate in a bounty challenge
 */
bountyRouter.post('/:id/participate', (req, res) => {
  try {
    const { submissionUrl, walletAddress, notes, creatorName, creatorEmail, solverType } = req.body;

    if (!submissionUrl || typeof submissionUrl !== 'string' || submissionUrl.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or junk submission URL. Deliverable reference must be at least 10 characters.'
      });
    }
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Payout wallet address is required' });
    }

    const bounty = getBountyById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const effectiveDeadline = bounty.deadline || (bounty.createdAt && bounty.deadlineDays ? (bounty.createdAt + bounty.deadlineDays * 86400000) : null);
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

    // Check session token
    let authUser = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authUser = getUserByToken(authHeader.split(' ')[1]);
    }

    // Bounty creators are strictly prohibited from participating in their own bounties
    const submitterEmail = (authUser?.email || creatorEmail || '').trim().toLowerCase();
    const submitterWallet = (authUser?.wallet_address || walletAddress || '').trim().toLowerCase();
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

    const submission = createBountySubmission({
      bountyId: req.params.id,
      creatorId: authUser?.id || null,
      creatorName: authUser?.name || creatorName || 'Anonymous Creator',
      creatorEmail: authUser?.email || creatorEmail || null,
      walletAddress: authUser?.wallet_address || walletAddress,
      submissionUrl,
      notes,
      solverType: solverType || 'Human Creator',
      collaborators: req.body.collaborators || []
    });

    const updatedBounty = getBountyById(req.params.id);

    res.json({
      success: true,
      message: 'Submission successfully recorded! Visible to challenge maintainer & admin.',
      submission,
      bounty: updatedBounty
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/bounties/:id/submissions/:submissionId
 * Update / revise an existing submission before challenge deadline expires
 */
bountyRouter.put('/:id/submissions/:submissionId', (req, res) => {
  try {
    let authUser = null;
    let isAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (activeAdminTokens.has(token)) {
        isAdmin = true;
      } else {
        authUser = getUserByToken(token);
        if (authUser && isAdminUser(authUser.email, authUser.wallet_address)) {
          isAdmin = true;
        }
      }
    }

    if (!authUser && !isAdmin) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to modify this submission.'
      });
    }

    const { submissionUrl, notes, collaborators } = req.body;
    if (submissionUrl && (typeof submissionUrl !== 'string' || submissionUrl.trim().length < 10)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or junk submission URL. Deliverable reference must be at least 10 characters.'
      });
    }

    const updated = updateBountySubmission({
      bountyId: req.params.id,
      submissionId: req.params.submissionId,
      submissionUrl,
      notes,
      collaborators,
      submitterEmail: isAdmin ? null : authUser?.email,
      submitterWallet: isAdmin ? null : authUser?.wallet_address,
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
 * Retrieve all community questions and discussion comments for a bounty
 */
bountyRouter.get('/:id/comments', (req, res) => {
  try {
    const comments = getBountyDiscussions(req.params.id);
    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/bounties/:id/comments
 * Add a new question, clarification, or sponsor response
 */
bountyRouter.post('/:id/comments', (req, res) => {
  try {
    let authUser = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authUser = getUserByToken(authHeader.split(' ')[1]);
    }

    const { content, authorName, authorHandle, authorRole, authorAvatar } = req.body;

    const newComment = addBountyDiscussion({
      bountyId: req.params.id,
      userId: authUser?.id || null,
      authorName: authorName || authUser?.name || 'Community Member',
      authorHandle: authorHandle || (authUser?.username ? `@${authUser.username}` : null),
      authorRole: authorRole || (authUser ? 'creator' : 'guest'),
      authorAvatar: authorAvatar || authUser?.avatar || null,
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

/**
 * POST /api/bounties/github-webhook
 * Automated GitHub bot integration: Auto-marks bounty "In Review" on PR and "Settled" on PR merge
 */
bountyRouter.post('/github-webhook', (req, res) => {
  try {
    const event = req.headers['x-github-event'] || 'pull_request';
    const payload = req.body;

    if (event === 'ping' || payload?.action === 'ping') {
      return res.json({ success: true, message: 'BotBounty GitHub Webhook alive and verified on BOT Chain!' });
    }

    if (event === 'pull_request') {
      const action = payload.action; // 'opened', 'closed', 'synchronize'
      const pr = payload.pull_request;
      if (!pr) return res.status(400).json({ success: false, error: 'No pull_request payload' });

      const prTitle = pr.title || '';
      const prBody = pr.body || '';
      const prUrl = pr.html_url || '';
      const isMerged = pr.merged === true;

      // Extract bounty ID from PR (e.g. bounty-bot-001 or bounty-arc-001)
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
        // Keep status Open while deadline is active so other participants can submit
        if (!bounty.deadline || Date.now() >= bounty.deadline) {
          db.prepare(`UPDATE bounties SET status = 'InReview' WHERE id = ? AND status = 'Open'`).run(bounty.id);
        }
        return res.json({
          success: true,
          action: 'logged_pr',
          bountyId: bounty.id,
          message: `GitHub PR #${pr.number} logged for bounty ${bounty.id}`
        });
      }

      if (action === 'closed' && isMerged) {
        // Tag PR as merged in submissions
        db.prepare(`UPDATE bounty_submissions SET github_pr_status = 'merged' WHERE bounty_id = ? AND submission_url LIKE ?`).run(bounty.id, `%${pr.number}%`);
        return res.json({
          success: true,
          action: 'pr_merged',
          bountyId: bounty.id,
          message: `PR #${pr.number} merged! Submission flagged for sponsor disbursement.`
        });
      }
    }

    return res.json({ success: true, message: 'Webhook processed.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Backwards compatibility for /api/bounties/:id/claim
 */
bountyRouter.post('/:id/claim', (req, res) => {
  try {
    const { prUrl, submissionUrl, solverAddress, walletAddress, solverType, notes } = req.body;
    const effectiveUrl = submissionUrl || prUrl;
    const effectiveWallet = walletAddress || solverAddress;

    if (!effectiveUrl || typeof effectiveUrl !== 'string' || effectiveUrl.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or junk submission URL. Deliverable reference must be at least 10 characters.'
      });
    }
    if (!effectiveWallet) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }

    const bounty = getBountyById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const effectiveDeadline = bounty.deadline || (bounty.createdAt && bounty.deadlineDays ? (bounty.createdAt + bounty.deadlineDays * 86400000) : null);
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

    const bountyCreatorWallet = (bounty.maintainer || '').trim().toLowerCase();
    const submitterWallet = (effectiveWallet || '').trim().toLowerCase();
    if (bountyCreatorWallet && submitterWallet && bountyCreatorWallet === submitterWallet) {
      return res.status(403).json({
        success: false,
        error: 'Bounty creators cannot participate in or submit solutions to their own bounties.'
      });
    }

    const submission = createBountySubmission({
      bountyId: req.params.id,
      walletAddress: effectiveWallet,
      submissionUrl: effectiveUrl,
      solverType: solverType || 'Human Creator',
      notes: notes || 'Deliverable proof submitted'
    });

    const updatedBounty = getBountyById(req.params.id);

    res.json({
      success: true,
      message: 'Deliverable proof submitted for review',
      submission,
      bounty: updatedBounty
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/bounties/:id/approve
 * Admin approves bounty directly via bountyRouter
 */
bountyRouter.post('/:id/approve', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let isAdmin = false;
    let adminEmail = 'admin';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (activeAdminTokens.has(token)) {
        isAdmin = true;
        adminEmail = activeAdminTokens.get(token).email || 'admin';
      } else {
        const user = getUserByToken(token);
        if (user && isAdminUser(user.email, user.wallet_address)) {
          isAdmin = true;
          adminEmail = user.email;
        }
      }
    }

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Administrative privileges required to approve bounties' });
    }

    const bounty = getBountyById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const updatedBounty = approveBountyRecord(req.params.id, adminEmail);

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
 * Platform administrator / challenge maintainer approves deliverable and disburses reward on Bohr Testnet
 */
bountyRouter.post('/:id/release', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let isAdmin = false;
    let adminEmail = 'olajideabdulquadri22@gmail.com';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (activeAdminTokens.has(token)) {
        isAdmin = true;
        adminEmail = activeAdminTokens.get(token).email || 'olajideabdulquadri22@gmail.com';
      } else {
        const user = getUserByToken(token);
        if (user && isAdminUser(user.email, user.wallet_address)) {
          isAdmin = true;
          adminEmail = user.email;
        }
      }
    }

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Approval and disbursal strictly belong to the platform administrator or challenge maintainer.'
      });
    }

    const bounty = getBountyById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    let winningSub = null;
    if (bounty.submissions && bounty.submissions.length > 0) {
      winningSub = bounty.submissions[0];
    } else {
      const recipientWallet = req.body.walletAddress || req.body.solverAddress || bounty.solver || '0x53e3800847e5Bb6fAfA0853d3e5a884B22aF8a20';
      winningSub = createBountySubmission({
        bountyId: bounty.id,
        walletAddress: recipientWallet,
        submissionUrl: bounty.prUrl || req.body.submissionUrl || 'https://scan.bohr.life',
        solverType: bounty.solverType || 'Verified Solver',
        notes: 'Deliverable approved for direct release'
      });
    }

    const providedTx = req.body.settlementTx || req.body.txHash;
    const result = disburseBountyReward({
      bountyId: bounty.id,
      submissionId: winningSub.id,
      adminEmail: adminEmail || 'olajideabdulquadri22@gmail.com',
      txHash: providedTx
    });

    const updatedBounty = getBountyById(bounty.id);

    res.json({
      success: true,
      message: 'Escrow reward disbursed to solver on Bohr Testnet',
      settlement: result,
      bounty: updatedBounty
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
