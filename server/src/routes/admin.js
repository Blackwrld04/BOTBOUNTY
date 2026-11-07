import express from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import {
  getUserByToken,
  isAdminUser,
  getAdminOverviewStats,
  getAllBounties,
  getBountyById,
  getBountySubmissions,
  disburseBountyReward,
  approveBountyRecord,
  rejectBountyRecord,
  getAllCreatorEmails,
  getAllUsers,
  scoreBountySubmission,
  scanArcEscrowDeposits,
  getAuditLedgerData,
  deleteSession,
  db
} from '../db.js';
import {
  sendBountyApprovedNotification,
  sendNewBountyBroadcastToCreators
} from '../email.js';
import {
  isExternalDbConfigured,
  syncSupabaseUsersToLocalSqlite
} from '../supabase.js';
import {
  verifySettlementTransaction,
  isValidTxHashFormat
} from '../services/onchainVerifier.js';
import { getBearerToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const adminRouter = express.Router();

// In-memory store for authenticated admin password sessions.
export const activeAdminTokens = new Map();

const ADMIN_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const WEAK_ADMIN_PASSWORDS = new Set([
  'arcbounty2026_admin!',
  'change_this_to_a_secure_admin_password!',
  'admin',
  'password',
  'changeme'
]);

const adminLoginLimiter = rateLimit({ name: 'admin-login', windowMs: 15 * 60_000, max: 10 });

function sha256(value) {
  return createHash('sha256').update(String(value), 'utf8').digest();
}

function constantTimePasswordMatch(supplied, configured) {
  const suppliedDigest = sha256(supplied);
  const configuredDigest = sha256(configured);
  return timingSafeEqual(suppliedDigest, configuredDigest);
}

function firstConfiguredAdminEmail() {
  const email = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)[0];
  return email || 'admin@botbounty.local';
}

function firstConfiguredAdminWallet() {
  return String(process.env.ADMIN_WALLETS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)[0] || null;
}

function pruneExpiredAdminTokens(now = Date.now()) {
  for (const [token, session] of activeAdminTokens) {
    if (!session || session.expiresAt <= now) activeAdminTokens.delete(token);
  }
}

/**
 * Resolve an administrative identity from a Bearer token only.
 * Query-string tokens and body tokens are deliberately never accepted.
 */
export function getAdminIdentity(req) {
  const token = getBearerToken(req);
  if (!token) return null;

  const now = Date.now();
  const adminSession = activeAdminTokens.get(token);
  if (adminSession) {
    if (!adminSession.expiresAt || adminSession.expiresAt <= now) {
      activeAdminTokens.delete(token);
      return null;
    }
    return {
      token,
      source: 'password',
      id: 'admin_master',
      email: adminSession.email || firstConfiguredAdminEmail(),
      name: 'Master Administrator',
      role: 'admin',
      is_admin: true,
      wallet_address: adminSession.walletAddress || firstConfiguredAdminWallet()
    };
  }

  const user = getUserByToken(token);
  if (user && isAdminUser(user.email, user.wallet_address)) {
    return { ...user, token, source: 'session', role: 'admin', is_admin: true };
  }

  return null;
}

/**
 * POST /api/admin/login
 * Validates the configured master administrator password.
 */
adminRouter.post('/login', adminLoginLimiter, (req, res) => {
  // Trim incidental whitespace from environment configuration (trailing
  // newlines in dashboards are common) without accepting a blank password.
  const configuredPassword = String(process.env.ADMIN_PASSWORD || '').trim();
  if (!configuredPassword) {
    return res.status(503).json({
      success: false,
      error: 'Administrator login is disabled: ADMIN_PASSWORD is not configured on the server.'
    });
  }

  if (WEAK_ADMIN_PASSWORDS.has(configuredPassword) || configuredPassword.length < 16) {
    return res.status(503).json({
      success: false,
      error: 'Administrator login is disabled: rotate ADMIN_PASSWORD to a strong, unique value (16+ characters).'
    });
  }

  const suppliedPassword = req.body?.password;
  if (typeof suppliedPassword !== 'string' || !constantTimePasswordMatch(suppliedPassword, configuredPassword)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid administrator password. Access denied.'
    });
  }

  pruneExpiredAdminTokens();
  const token = `arc_adm_${randomBytes(32).toString('hex')}`;
  const adminEmail = firstConfiguredAdminEmail();
  activeAdminTokens.set(token, {
    createdAt: Date.now(),
    expiresAt: Date.now() + ADMIN_TOKEN_TTL_MS,
    email: adminEmail,
    walletAddress: firstConfiguredAdminWallet()
  });

  return res.json({
    success: true,
    message: 'Master administrator access granted',
    token,
    expiresAt: Date.now() + ADMIN_TOKEN_TTL_MS,
    admin: {
      role: 'admin',
      name: 'Master Administrator',
      email: adminEmail
    }
  });
});

/**
 * Middleware: Verify Admin Access
 * Validates either a dedicated admin password token or an authorized admin user session.
 */
export function requireAdmin(req, res, next) {
  const identity = getAdminIdentity(req);
  if (!identity) {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please enter administrator credentials.'
      });
    }

    const user = getUserByToken(token);
    if (user) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Your account does not have administrative privileges.'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Admin session has expired or is invalid. Please sign in again.'
    });
  }

  req.user = identity;
  req.adminUser = identity;
  return next();
}

/**
 * POST /api/admin/logout
 * Invalidates an admin password session or revokes an admin user session.
 */
adminRouter.post('/logout', (req, res) => {
  const token = getBearerToken(req);
  if (token) {
    activeAdminTokens.delete(token);
    if (getUserByToken(token)) deleteSession(token);
  }
  res.json({ success: true, message: 'Admin logged out successfully' });
});

// Protect subsequent routes in this router.
adminRouter.use(requireAdmin);

/**
 * GET /api/admin/verify-token
 */
adminRouter.get('/verify-token', (req, res) => {
  res.json({
    success: true,
    admin: {
      role: 'admin',
      name: req.user.name,
      email: req.user.email
    }
  });
});

/**
 * GET /api/admin/stats
 */
adminRouter.get('/stats', (req, res) => {
  try {
    const stats = getAdminOverviewStats();
    res.json({
      success: true,
      stats,
      admin: {
        email: req.user.email,
        name: req.user.name,
        walletAddress: req.user.wallet_address
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/users
 */
adminRouter.get('/users', async (req, res) => {
  try {
    if (isExternalDbConfigured()) {
      await syncSupabaseUsersToLocalSqlite(db);
    }
    const users = getAllUsers();
    res.json({
      success: true,
      totalUsers: users.length,
      users
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/bounties
 */
adminRouter.get('/bounties', (req, res) => {
  try {
    const bounties = getAllBounties({ includePending: true, ...req.query });
    res.json({
      success: true,
      total: bounties.length,
      bounties
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/bounties/:id/submissions
 */
adminRouter.get('/bounties/:id/submissions', (req, res) => {
  try {
    const bounty = getBountyById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const submissions = getBountySubmissions(bounty.id);
    res.json({
      success: true,
      bounty,
      totalSubmissions: submissions.length,
      submissions
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/distribute (or /api/admin/disburse)
 */
adminRouter.post(['/distribute', '/disburse'], async (req, res) => {
  try {
    const { bountyId, submissionId, amount, txHash: clientTxHash } = req.body || {};

    if (!bountyId || !submissionId) {
      return res.status(400).json({
        success: false,
        error: 'bountyId and submissionId are required to disburse funds.'
      });
    }

    const bounty = getBountyById(bountyId);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    if (bounty.status === 'Settled' || bounty.paymentStatus === 'settled') {
      return res.status(409).json({ success: false, error: 'This bounty has already been settled.' });
    }

    const sub = db.prepare('SELECT * FROM bounty_submissions WHERE id = ? AND bounty_id = ?')
      .get(submissionId, bounty.id);
    if (!sub) {
      return res.status(404).json({ success: false, error: 'Submission not found for this bounty.' });
    }

    if (sub.status === 'awarded' || Number(sub.reward_paid) > 0) {
      return res.status(409).json({ success: false, error: 'This submission has already been awarded.' });
    }

    const requestedAmount = amount === undefined || amount === null ? Number(bounty.amount) : Number(amount);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > Number(bounty.amount)) {
      return res.status(400).json({
        success: false,
        error: 'Disbursement amount must be greater than zero and cannot exceed the bounty amount.'
      });
    }

    if (!clientTxHash || !isValidTxHashFormat(clientTxHash)) {
      return res.status(400).json({
        success: false,
        error: 'A valid wallet-signed on-chain settlement transaction hash (txHash) is required.'
      });
    }

    if (!bounty.onChainBountyId) {
      return res.status(400).json({
        success: false,
        error: 'This bounty has no on-chain escrow record, so it cannot be settled.'
      });
    }

    await verifySettlementTransaction({
      txHash: clientTxHash,
      expectedSolver: sub.wallet_address,
      expectedAmount: requestedAmount,
      expectedBountyId: bounty.onChainBountyId
    });

    const settlement = disburseBountyReward({
      bountyId: bounty.id,
      submissionId: submissionId,
      adminEmail: req.user.email,
      customAmount: requestedAmount,
      txHash: clientTxHash
    });

    res.json({
      success: true,
      message: `Successfully disbursed ${settlement.amount} $BOT to creator on BOT Chain!`,
      settlement
    });
  } catch (err) {
    const status = /already|reused|settled|awarded/i.test(err.message) ? 409 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/verify-bounty
 * Admin updates the escrow funding status using an allowlisted value.
 */
adminRouter.post('/verify-bounty', (req, res) => {
  try {
    const { bountyId, paymentStatus } = req.body || {};
    if (!bountyId) {
      return res.status(400).json({ success: false, error: 'bountyId is required.' });
    }

    const allowedStatuses = new Set(['funded', 'pending_review', 'rejected']);
    const validStatus = paymentStatus || 'funded';
    if (!allowedStatuses.has(validStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid payment status.' });
    }

    const bounty = getBountyById(bountyId);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found.' });
    }

    db.prepare(`UPDATE bounties SET payment_status = ? WHERE id = ?`).run(validStatus, bounty.id);

    const updated = getBountyById(bounty.id);
    res.json({
      success: true,
      message: `Bounty deposit status updated to ${validStatus}`,
      bounty: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/bounties/:id/approve
 */
adminRouter.post('/bounties/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const bounty = getBountyById(id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const updatedBounty = approveBountyRecord(bounty.id, req.user.email);

    try {
      if (updatedBounty.maintainerEmail) {
        sendBountyApprovedNotification(updatedBounty.maintainerEmail, updatedBounty).catch((err) => {
          console.warn('[Admin Approve] Maintainer notification error:', err.message);
        });
      }
      const creatorEmails = getAllCreatorEmails();
      if (creatorEmails && creatorEmails.length > 0) {
        sendNewBountyBroadcastToCreators(creatorEmails, updatedBounty).catch((err) => {
          console.warn('[Admin Approve] Creator broadcast error:', err.message);
        });
      }
    } catch (mailErr) {
      console.warn('[Admin Approve] Email broadcast dispatch error:', mailErr);
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
 * POST /api/admin/bounties/:id/reject
 */
adminRouter.post('/bounties/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const bounty = getBountyById(id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const safeReason = typeof reason === 'string'
      ? reason.trim().slice(0, 500)
      : 'Escrow deposit or challenge conditions not verified';

    const updatedBounty = rejectBountyRecord(bounty.id, safeReason);
    res.json({
      success: true,
      message: `Bounty "${updatedBounty.title}" rejected.`,
      bounty: updatedBounty
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/submissions/:submissionId/score
 */
adminRouter.post('/submissions/:submissionId/score', (req, res) => {
  try {
    const { submissionId } = req.params;
    const { scoreCodeQuality, scoreCreativity, scoreCompleteness, reviewerNotes } = req.body || {};

    const scores = [scoreCodeQuality, scoreCreativity, scoreCompleteness];
    for (const score of scores) {
      if (score !== undefined && score !== null) {
        const numeric = Number(score);
        if (!Number.isInteger(numeric) || numeric < 0 || numeric > 100) {
          return res.status(400).json({ success: false, error: 'Scores must be integers between 0 and 100.' });
        }
      }
    }

    if (reviewerNotes !== undefined && (typeof reviewerNotes !== 'string' || reviewerNotes.length > 2000)) {
      return res.status(400).json({ success: false, error: 'Reviewer notes must be 2000 characters or fewer.' });
    }

    const scored = scoreBountySubmission({
      submissionId,
      scoreCodeQuality,
      scoreCreativity,
      scoreCompleteness,
      reviewerNotes
    });
    res.json({ success: true, message: 'Submission scored successfully', scored });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/bounties/:id/disburse-multi-winner
 * Disabled: the active BotBountyEscrow contract settles an entire bounty to a
 * single solver in one BountySettled event. Recording multiple recipients
 * against one settlement would fabricate on-chain proof, so split payouts must
 * wait for a contract that supports them.
 */
adminRouter.post('/bounties/:id/disburse-multi-winner', (req, res) => {
  return res.status(501).json({
    success: false,
    error: 'Split payouts are not supported by the active single-solver escrow contract. Use /api/admin/distribute to settle the winning submission.'
  });
});


/**
 * GET /api/admin/scan-deposits
 */
adminRouter.get('/scan-deposits', (req, res) => {
  try {
    const result = scanArcEscrowDeposits();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function csvCell(value) {
  let text = value === undefined || value === null ? '' : String(value);
  // Prevent spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * GET /api/admin/export-csv
 */
adminRouter.get('/export-csv', (req, res) => {
  try {
    const ledger = getAuditLedgerData();
    const headers = [
      'Disbursement_ID',
      'Distributed_At_UTC',
      'Bounty_ID',
      'Bounty_Title',
      'Sponsor_Name',
      'Sponsor_Wallet',
      'Recipient_Address',
      'Recipient_Email',
      'Amount_BOT',
      'BOTChain_Tx_Hash',
      'Admin_Email'
    ];

    const csvRows = [headers.map(csvCell).join(',')];
    for (const row of ledger) {
      csvRows.push([
        row.disbursement_id,
        new Date(row.distributed_at).toISOString(),
        row.bounty_id,
        row.bounty_title || '',
        row.sponsor_name || '',
        row.sponsor_wallet || '',
        row.recipient_address,
        row.recipient_email || '',
        row.amount_usdc,
        row.tx_hash,
        row.admin_email
      ].map(csvCell).join(','));
    }

    const csvContent = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename=botbounty_payout_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
