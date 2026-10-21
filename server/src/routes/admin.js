import express from 'express';
import { randomBytes } from 'crypto';
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
  disburseMultiWinnerRewards,
  scanArcEscrowDeposits,
  getAuditLedgerData,
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
  verifySettlementTransaction
} from '../services/onchainVerifier.js';

export const adminRouter = express.Router();

// In-memory store for authenticated admin password sessions
export const activeAdminTokens = new Map();

/**
 * POST /api/admin/login
 * Public authentication route: validates master administrator password
 */
adminRouter.post('/login', (req, res) => {
  const { password } = req.body;
  const configuredPassword = (process.env.ADMIN_PASSWORD || '').trim();
  if (!configuredPassword) {
    return res.status(503).json({
      success: false,
      error: 'Administrator login is disabled: ADMIN_PASSWORD is not configured on the server.'
    });
  }

  if (!password || password.trim() !== configuredPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid administrator password. Access denied.'
    });
  }

  const token = `arc_adm_${randomBytes(24).toString('hex')}`;
  activeAdminTokens.set(token, {
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });

  return res.json({
    success: true,
    message: 'Master administrator access granted',
    token,
    admin: {
      role: 'admin',
      name: 'Master Administrator',
      email: process.env.GMAIL_USER || 'admin@arcbounty.io'
    }
  });
});

/**
 * Middleware: Verify Admin Access
 * Validates either dedicated admin password token or authorized admin user session
 */
export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query?.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please enter administrator credentials.'
    });
  }

  // 1. Check dedicated admin password session
  if (activeAdminTokens.has(token)) {
    const session = activeAdminTokens.get(token);
    if (Date.now() < session.expiresAt) {
      req.user = {
        id: 'admin_master',
        email: process.env.GMAIL_USER || 'admin@botbounty.tech',
        name: 'Master Administrator',
        role: 'admin',
        wallet_address: process.env.ESCROW_WALLET_ADDRESS || '0xBE0aaE21b6252aa1207cAa50A753e8C45bCBCbc5'
      };
      return next();
    } else {
      activeAdminTokens.delete(token);
      return res.status(401).json({
        success: false,
        error: 'Admin session has expired. Please re-enter password.'
      });
    }
  }

  // 2. Fallback: check SQLite database user session token
  const user = getUserByToken(token);
  if (user) {
    const isAdmin = isAdminUser(user.email, user.wallet_address);
    if (isAdmin) {
      req.user = user;
      return next();
    }
    return res.status(403).json({
      success: false,
      error: 'Access denied. Your account does not have administrative privileges.'
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid or expired session token.'
  });
}

/**
 * POST /api/admin/logout
 * Invalidate admin session
 */
adminRouter.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeAdminTokens.delete(token);
  }
  res.json({ success: true, message: 'Admin logged out successfully' });
});

// Protect subsequent routes in this router with requireAdmin
adminRouter.use(requireAdmin);

/**
 * GET /api/admin/verify-token
 * Lightweight check to confirm admin token is still valid
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
 * Overview metrics for Admin Dashboard
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
 * Directory of registered creators & users with profile details
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
 * All bounties across the platform with full status details & submission counts
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
 * Review all creator submissions and participants for a specific challenge
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
 * Admin dispatches USDC prize directly to the winning creator
 */
adminRouter.post(['/distribute', '/disburse'], async (req, res) => {
  try {
    const { bountyId, submissionId, amount, txHash: clientTxHash } = req.body;

    if (!bountyId || !submissionId) {
      return res.status(400).json({
        success: false,
        error: 'bountyId and submissionId are required to disburse funds'
      });
    }

    const bounty = getBountyById(bountyId);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const sub = db.prepare('SELECT * FROM bounty_submissions WHERE id = ?').get(submissionId);
    if (!sub) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    const txHash = clientTxHash;
    if (!txHash) {
      return res.status(400).json({
        success: false,
        error: 'A wallet-signed on-chain settlement transaction hash (txHash) is required. The server never signs or relays releases.'
      });
    }
    if (!bounty.onChainBountyId) {
      return res.status(400).json({
        success: false,
        error: 'This bounty has no on-chain escrow record, so it cannot be settled.'
      });
    }

    // Verify on Bohr Testnet (bound to this bounty's on-chain id)
    await verifySettlementTransaction({
      txHash,
      expectedSolver: sub.wallet_address,
      expectedAmount: amount || bounty.amount,
      expectedBountyId: bounty.onChainBountyId
    });

    const settlement = disburseBountyReward({
      bountyId,
      submissionId,
      adminEmail: req.user.email,
      customAmount: amount,
      txHash
    });

    res.json({
      success: true,
      message: `Successfully disbursed ${settlement.amount} $BOT to creator on Bohr Testnet!`,
      settlement
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/verify-bounty
 * Admin updates deposit status or confirms on-chain escrow funding
 */
adminRouter.post('/verify-bounty', (req, res) => {
  try {
    const { bountyId, paymentStatus } = req.body;
    if (!bountyId) {
      return res.status(400).json({ success: false, error: 'bountyId is required' });
    }

    const validStatus = paymentStatus || 'funded';
    db.prepare(`UPDATE bounties SET payment_status = ? WHERE id = ?`).run(validStatus, bountyId);

    const updated = getBountyById(bountyId);
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
 * Admin reviews escrow deposit and challenge criteria, approves and launches live
 */
adminRouter.post('/bounties/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const bounty = getBountyById(id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const updatedBounty = approveBountyRecord(id, req.user?.email || 'admin');

    // Asynchronously dispatch email notifications
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
 * Admin rejects a pending bounty
 */
adminRouter.post('/bounties/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const bounty = getBountyById(id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const updatedBounty = rejectBountyRecord(id, reason || 'Escrow deposit or challenge conditions not verified');
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
 * Record structured rubric scores and reviewer notes
 */
adminRouter.post('/submissions/:submissionId/score', (req, res) => {
  try {
    const { submissionId } = req.params;
    const { scoreCodeQuality, scoreCreativity, scoreCompleteness, reviewerNotes } = req.body;
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
 * Disburse tiered prizes to multiple ranked winners
 */
adminRouter.post('/bounties/:id/disburse-multi-winner', async (req, res) => {
  try {
    const { id } = req.params;
    const { winners } = req.body;
    if (!winners || !Array.isArray(winners) || winners.length === 0) {
      return res.status(400).json({ success: false, error: 'No winners provided for split disbursement' });
    }

    const bounty = getBountyById(id);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const topTxHash = req.body.txHash || req.body.settlementTx;
    if (!bounty.onChainBountyId) {
      return res.status(400).json({
        success: false,
        error: 'This bounty has no on-chain escrow record, so it cannot be settled.'
      });
    }

    for (const w of winners) {
      const winnerTx = w.txHash || topTxHash;
      if (!winnerTx) {
        return res.status(400).json({
          success: false,
          error: `Winner ${w.submissionId || w.walletAddress} is missing verified on-chain settlement txHash.`
        });
      }
      w.txHash = winnerTx;

      await verifySettlementTransaction({
        txHash: w.txHash,
        expectedSolver: w.walletAddress,
        expectedAmount: w.amount,
        expectedBountyId: bounty.onChainBountyId
      });
    }

    const adminEmail = req.adminUser?.email || 'admin@arcbounty.io';
    const result = disburseMultiWinnerRewards({
      bountyId: id,
      winners,
      adminEmail
    });
    res.json({
      success: true,
      message: 'Multi-winner prize distribution settled successfully on BOT Chain Bohr Testnet.',
      result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/scan-deposits
 * Auto-detect incoming Arc Escrow deposits on Arc L1
 */
adminRouter.get('/scan-deposits', (req, res) => {
  try {
    const result = scanArcEscrowDeposits();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/export-csv
 * 1-Click CSV Audit Ledger Export
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
      'Amount_USDC',
      'Arc_Tx_Hash',
      'Admin_Email'
    ];

    const csvRows = [headers.join(',')];
    for (const row of ledger) {
      csvRows.push([
        `"${row.disbursement_id}"`,
        `"${new Date(row.distributed_at).toISOString()}"`,
        `"${row.bounty_id}"`,
        `"${(row.bounty_title || '').replace(/"/g, '""')}"`,
        `"${(row.sponsor_name || '').replace(/"/g, '""')}"`,
        `"${row.sponsor_wallet || ''}"`,
        `"${row.recipient_address}"`,
        `"${row.recipient_email || ''}"`,
        `"${row.amount_usdc}"`,
        `"${row.tx_hash}"`,
        `"${row.admin_email}"`
      ].join(','));
    }

    const csvContent = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=arcbounty_audit_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

