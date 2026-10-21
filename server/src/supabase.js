import 'dotenv/config';
import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { FABRICATED_SEED_TX } from './seedEvidence.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase / External PostgreSQL Connection Pool
const databaseUrl = process.env.DATABASE_URL?.trim();

export const pool = (databaseUrl && process.env.DB_PATH !== ':memory:')
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 25, // Up to 25 pooled connections for high-throughput concurrency
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000
    })
  : null;

// Optional: Direct Supabase REST/Realtime Client
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();

export const supabase = (supabaseUrl && supabaseKey && process.env.DB_PATH !== ':memory:')
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Returns true if Supabase / External PostgreSQL is configured
 */
export function isExternalDbConfigured() {
  return Boolean(pool) && process.env.DB_PATH !== ':memory:';
}

/**
 * Executes a query against the Supabase PostgreSQL connection pool
 */
export async function queryPg(text, params = []) {
  if (!pool) {
    throw new Error('Supabase / PostgreSQL connection is not configured. Please set DATABASE_URL in server/.env');
  }
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

/**
 * Seeds initial bounties, submissions, and disbursements into Supabase if table is empty
 */
export async function seedSupabaseInitialData(initialBounties = []) {
  if (!pool) return;
  try {
    const countRes = await pool.query('SELECT count(*) as count FROM bounties');
    const count = parseInt(countRes.rows[0]?.count || '0', 10);
    if (count > 0) {
      console.log(`[Supabase] bounties table already contains ${count} records. Seeding skipped.`);
      return;
    }

    console.log('[Supabase] Seeding canonical bounties into Supabase PostgreSQL...');
    for (const b of initialBounties) {
      await pool.query(`
        INSERT INTO bounties (
          id, bounty_id, title, category, category_name, category_color,
          submission_type, issue_url, amount, tags, status, payment_status,
          deposit_tx, escrow_wallet, maintainer, maintainer_name, maintainer_email,
          solver, solver_type, pr_url, description, created_at,
          deadline, settled_at, settlement_tx
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22,
          $23, $24, $25
        ) ON CONFLICT (id) DO NOTHING
      `, [
        b.id,
        b.bountyId,
        b.title,
        b.category,
        b.categoryName,
        b.categoryColor,
        b.submissionType,
        b.issueUrl,
        b.amount,
        JSON.stringify(b.tags),
        b.status,
        b.paymentStatus,
        b.depositTx,
        b.escrowWallet,
        b.maintainer,
        b.maintainerName,
        b.maintainerEmail,
        b.solver,
        b.solverType,
        b.prUrl,
        b.description,
        b.createdAt,
        b.deadline,
        b.settledAt || null,
        b.settlementTx || null
      ]);
    }

    // Seed canonical submissions (without fake on-chain disbursement hashes)
    await pool.query(`
      INSERT INTO bounty_submissions (
        id, bounty_id, creator_id, user_id, creator_name, creator_email,
        wallet_address, submission_url, notes, solver_type, status,
        reward_paid, disbursement_tx, submitted_at
      ) VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14),
        ($15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28),
        ($29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42)
      ON CONFLICT (id) DO NOTHING
    `, [
      'sub_seed_001', 'bounty-arc-003', 'usr_seed_creator_1', 'usr_seed_creator_1', 'Alex Researcher', 'crypto_analyst@x.com',
      '0x9923Bc8E4786A6B71D0052F5eCE984bC9d123456', 'https://x.com/crypto_analyst/status/18389102938102',
      'Completed full 15-tweet breakdown with visual architecture flowcharts.', 'Alex Researcher', 'awarded', 800,
      null, Date.now() - 86400000 * 2,

      'sub_71877b765784d7da', 'bounty-arc-3356', 'usr_seed_creator_2', 'usr_seed_creator_2', 'Alex Rivers', 'alex.rivers@designguild.org',
      '0x51a8b1bfeb88bdfa9207e999c0b2023c70c97c8f', 'https://www.figma.com/design/arc-interactive-infographic',
      'High-fidelity interactive SVG visualization of Circle Arc settlement.', 'Alex Rivers', 'awarded', 750,
      null, Date.now() - 86400000 * 3,

      'sub_seed_002', 'bounty-arc-004', 'usr_seed_creator_3', 'usr_seed_creator_3', 'Meme God', 'memegod@x.com',
      '0x71C568ba74d3B107292995bB791e317614399A45', 'https://x.com/memegod_sol/status/1838192830192',
      'Created 5 top-tier viral memes for Circle Arc.', 'Meme God', 'awarded', 450,
      null, Date.now() - 86400000 * 4
    ]);

    console.log('[Supabase] Successfully seeded initial demo bounties and submissions (fabricated hashes excluded).');
  } catch (err) {
    console.error('[Supabase] Error seeding initial data:', err.message);
  }
}

/**
 * Syncs any existing bounties/submissions from Supabase down into local SQLite cache
 */
export async function syncSupabaseToLocalSqlite(sqliteDb) {
  if (!pool || !sqliteDb) return;
  try {
    const bountyRows = await pool.query('SELECT * FROM bounties ORDER BY created_at DESC');
    if (bountyRows.rows.length > 0) {
      const insertBounty = sqliteDb.prepare(`
        INSERT OR REPLACE INTO bounties (
          id, bounty_id, title, category, category_name, category_color,
          submission_type, issue_url, amount, tags, status, payment_status,
          deposit_tx, escrow_wallet, maintainer, maintainer_name, maintainer_email,
          solver, solver_type, pr_url, description, created_at,
          deadline, settled_at, settlement_tx, reward_distribution, on_chain_bounty_id
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `);
      for (const r of bountyRows.rows) {
        insertBounty.run(
          r.id, r.bounty_id, r.title, r.category, r.category_name, r.category_color,
          r.submission_type, r.issue_url, Number(r.amount), typeof r.tags === 'string' ? r.tags : JSON.stringify(r.tags),
          r.status, r.payment_status, r.deposit_tx, r.escrow_wallet, r.maintainer,
          r.maintainer_name, r.maintainer_email, r.solver, r.solver_type, r.pr_url,
          r.description, Number(r.created_at), Number(r.deadline), r.settled_at ? Number(r.settled_at) : null,
          r.settlement_tx, r.reward_distribution || null, r.on_chain_bounty_id || null
        );
      }
    }

    const subRows = await pool.query('SELECT * FROM bounty_submissions ORDER BY submitted_at DESC');
    if (subRows.rows.length > 0) {
      const insertSub = sqliteDb.prepare(`
        INSERT OR REPLACE INTO bounty_submissions (
          id, bounty_id, creator_id, creator_name, creator_email,
          wallet_address, submission_url, notes, solver_type, status,
          reward_paid, disbursement_tx, submitted_at, revision_count,
          revision_history, collaborators, score_code_quality, score_creativity,
          score_completeness, reviewer_notes, github_pr_status, submit_tx
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `);
      for (const s of subRows.rows) {
        insertSub.run(
          s.id, s.bounty_id, s.creator_id || s.user_id, s.creator_name, s.creator_email,
          s.wallet_address, s.submission_url, s.notes, s.solver_type, s.status,
          Number(s.reward_paid || 0), s.disbursement_tx, Number(s.submitted_at),
          s.revision_count || 1, s.revision_history || '[]', s.collaborators || '[]',
          s.score_code_quality || null, s.score_creativity || null, s.score_completeness || null,
          s.reviewer_notes || null, s.github_pr_status || null, s.submit_tx || null
        );
      }
    }

    const discRows = await pool.query('SELECT * FROM bounty_discussions ORDER BY created_at ASC');
    if (discRows.rows.length > 0) {
      const insertDisc = sqliteDb.prepare(`
        INSERT OR REPLACE INTO bounty_discussions (
          id, bounty_id, user_id, author_name, author_handle,
          author_role, author_avatar, content, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of discRows.rows) {
        insertDisc.run(
          d.id, d.bounty_id, d.user_id, d.author_name, d.author_handle,
          d.author_role, d.author_avatar, d.content, Number(d.created_at)
        );
      }
    }

    // Sync users down from Supabase into local SQLite cache
    const userRows = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    if (userRows.rows.length > 0) {
      const insertUser = sqliteDb.prepare(`
        INSERT OR REPLACE INTO users (
          id, email, name, username, avatar, wallet_address,
          usdc_balance, provider, role, discipline, bio,
          telegram, discord, x, github, password_hash, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `);
      for (const u of userRows.rows) {
        insertUser.run(
          u.id,
          (u.email || '').toLowerCase().trim(),
          u.name || 'User',
          u.username || (u.email ? u.email.split('@')[0] : u.id),
          u.avatar || null,
          u.wallet_address || null,
          Number(u.usdc_balance || 0),
          u.provider || 'email',
          u.role || 'creator',
          u.discipline || 'Content',
          u.bio || null,
          u.telegram || null,
          u.discord || null,
          u.x || null,
          u.github || null,
          u.password_hash || null,
          Number(u.created_at || Date.now())
        );
      }
    }

    // Sync disbursements down from Supabase into local SQLite cache
    const disbRows = await pool.query('SELECT * FROM disbursements ORDER BY distributed_at DESC');
    if (disbRows.rows.length > 0) {
      const insertDisb = sqliteDb.prepare(`
        INSERT OR REPLACE INTO disbursements (
          id, bounty_id, submission_id,
          recipient_address, recipient_email, amount,
          tx_hash, admin_email, distributed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of disbRows.rows) {
        insertDisb.run(
          d.id || d.disbursement_id,
          d.bounty_id,
          d.submission_id,
          d.recipient_address,
          d.recipient_email || null,
          Number(d.amount || d.amount_usdc || 0),
          d.tx_hash,
          d.admin_email || 'admin@arcbounty.io',
          Number(d.distributed_at || Date.now())
        );
      }
    }

    console.log(`[Supabase] Synced ${bountyRows.rows.length} bounties, ${subRows.rows.length} submissions, and ${userRows.rows.length} users to local cache.`);
  } catch (err) {
    console.warn('[Supabase] Warning syncing to local SQLite:', err.message);
  }
}

/**
 * On-demand sync of all Supabase users to local SQLite cache
 */
export async function syncSupabaseUsersToLocalSqlite(sqliteDb) {
  if (!pool || !sqliteDb) return [];
  try {
    const userRows = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    if (userRows.rows.length > 0) {
      const insertUser = sqliteDb.prepare(`
        INSERT OR REPLACE INTO users (
          id, email, name, username, avatar, wallet_address,
          usdc_balance, provider, role, discipline, bio,
          telegram, discord, x, github, password_hash, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `);
      for (const u of userRows.rows) {
        insertUser.run(
          u.id,
          (u.email || '').toLowerCase().trim(),
          u.name || 'User',
          u.username || (u.email ? u.email.split('@')[0] : u.id),
          u.avatar || null,
          u.wallet_address || null,
          Number(u.usdc_balance || 0),
          u.provider || 'email',
          u.role || 'creator',
          u.discipline || 'Content',
          u.bio || null,
          u.telegram || null,
          u.discord || null,
          u.x || null,
          u.github || null,
          u.password_hash || null,
          Number(u.created_at || Date.now())
        );
      }
    }
    return userRows.rows;
  } catch (err) {
    console.warn('[Supabase] Warning syncing users to SQLite:', err.message);
    return [];
  }
}

/**
 * Lookup a user by email, username, or ID directly from Supabase PostgreSQL
 */
export async function pgGetUserByIdentifier(identifier) {
  if (!pool || !identifier) return null;
  try {
    const clean = identifier.trim().toLowerCase().replace(/^@/, '');
    const res = await pool.query(`
      SELECT * FROM users
      WHERE LOWER(email) = $1 OR LOWER(username) = $1 OR id = $1
      LIMIT 1
    `, [clean]);
    return res.rows[0] || null;
  } catch (err) {
    console.warn('[Supabase] pgGetUserByIdentifier warning:', err.message);
    return null;
  }
}

/**
 * Auto-initializes all tables and indexes in Supabase PostgreSQL if they do not exist
 */
export async function initSupabaseDatabase(initialBounties = [], sqliteDb = null) {
  if (!pool) {
    console.log('[Database] DATABASE_URL not set. Running embedded SQLite engine.');
    return { success: false, reason: 'no_database_url' };
  }

  try {
    // 1. Verify connection
    const testResult = await pool.query('SELECT current_database(), current_user;');
    const currentDb = testResult.rows[0]?.current_database || 'postgres';
    console.log(`[Supabase] Successfully connected to PostgreSQL database '${currentDb}'.`);

    // 2. Load schema.sql and execute
    const schemaPath = join(__dirname, '../schema.sql');
    if (existsSync(schemaPath)) {
      const ddl = readFileSync(schemaPath, 'utf8');
      await pool.query(ddl);
      console.log('[Supabase] All production relational tables and indexes verified.');
    }

    // 2b. Add on_chain_bounty_id and submit_tx columns if not already present; purge fabricated hashes
    try {
      await pool.query(`ALTER TABLE bounties ADD COLUMN IF NOT EXISTS on_chain_bounty_id TEXT;`);
      await pool.query(`ALTER TABLE bounty_submissions ADD COLUMN IF NOT EXISTS submit_tx TEXT;`);
      await pool.query(`UPDATE bounties SET deposit_tx = NULL WHERE LOWER(deposit_tx) = ANY($1::text[])`, [FABRICATED_SEED_TX]);
      await pool.query(`UPDATE bounties SET settlement_tx = NULL WHERE LOWER(settlement_tx) = ANY($1::text[])`, [FABRICATED_SEED_TX]);
      await pool.query(`UPDATE bounty_submissions SET disbursement_tx = NULL WHERE LOWER(disbursement_tx) = ANY($1::text[])`, [FABRICATED_SEED_TX]);
      await pool.query(`DELETE FROM disbursements WHERE LOWER(tx_hash) = ANY($1::text[])`, [FABRICATED_SEED_TX]);
    } catch (migErr) {
      console.warn('[Supabase] Migration or seed purge warning:', migErr.message);
    }

    // 3. Seed canonical data if bounties table is empty
    if (initialBounties && initialBounties.length > 0) {
      await seedSupabaseInitialData(initialBounties);
    }

    // 4. Sync down to local SQLite cache if available
    if (sqliteDb) {
      await syncSupabaseToLocalSqlite(sqliteDb);
    }

    return { success: true, database: currentDb };
  } catch (err) {
    console.error('[Supabase] Failed to initialize PostgreSQL connection:', err.message);
    console.warn('[Supabase] Falling back to embedded SQLite for safety.');
    return { success: false, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// Asynchronous Write-Through Helpers for Supabase PostgreSQL
// -----------------------------------------------------------------------------

export async function pgSaveUser(user) {
  if (!pool || !user) return;
  try {
    await pool.query(`
      INSERT INTO users (
        id, email, name, username, avatar, wallet_address, usdc_balance,
        provider, role, discipline, bio, telegram, discord, x, github, password_hash, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        username = EXCLUDED.username,
        avatar = EXCLUDED.avatar,
        wallet_address = EXCLUDED.wallet_address,
        usdc_balance = EXCLUDED.usdc_balance,
        role = EXCLUDED.role,
        discipline = EXCLUDED.discipline,
        bio = EXCLUDED.bio,
        telegram = EXCLUDED.telegram,
        discord = EXCLUDED.discord,
        x = EXCLUDED.x,
        github = EXCLUDED.github,
        password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash)
    `, [
      user.id, user.email, user.name, user.username, user.avatar || null,
      user.wallet_address || null, user.usdc_balance || 0, user.provider || 'email',
      user.role || 'creator', user.discipline || 'Content', user.bio || null,
      user.telegram || null, user.discord || null, user.x || null, user.github || null,
      user.password_hash || null, user.created_at || Date.now()
    ]);
  } catch (err) {
    console.error('[Supabase] pgSaveUser error:', err.message);
  }
}

export async function pgSaveBounty(b) {
  if (!pool || !b) return;
  try {
    await pool.query(`
      INSERT INTO bounties (
        id, bounty_id, title, category, category_name, category_color,
        submission_type, issue_url, amount, tags, status, payment_status,
        deposit_tx, escrow_wallet, maintainer, maintainer_name, maintainer_email,
        solver, solver_type, pr_url, description, created_at,
        deadline, settled_at, settlement_tx, reward_distribution, on_chain_bounty_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22,
        $23, $24, $25, $26, $27
      ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        category_name = EXCLUDED.category_name,
        category_color = EXCLUDED.category_color,
        submission_type = EXCLUDED.submission_type,
        issue_url = EXCLUDED.issue_url,
        amount = EXCLUDED.amount,
        tags = EXCLUDED.tags,
        status = EXCLUDED.status,
        payment_status = EXCLUDED.payment_status,
        deposit_tx = EXCLUDED.deposit_tx,
        escrow_wallet = EXCLUDED.escrow_wallet,
        maintainer = EXCLUDED.maintainer,
        maintainer_name = EXCLUDED.maintainer_name,
        maintainer_email = EXCLUDED.maintainer_email,
        solver = EXCLUDED.solver,
        solver_type = EXCLUDED.solver_type,
        pr_url = EXCLUDED.pr_url,
        description = EXCLUDED.description,
        deadline = EXCLUDED.deadline,
        settled_at = EXCLUDED.settled_at,
        settlement_tx = EXCLUDED.settlement_tx,
        reward_distribution = EXCLUDED.reward_distribution,
        on_chain_bounty_id = COALESCE(EXCLUDED.on_chain_bounty_id, bounties.on_chain_bounty_id)
    `, [
      b.id, b.bounty_id || b.bountyId, b.title, b.category, b.category_name || b.categoryName,
      b.category_color || b.categoryColor, b.submission_type || b.submissionType,
      b.issue_url || b.issueUrl, b.amount,
      typeof b.tags === 'string' ? b.tags : JSON.stringify(b.tags || []),
      b.status, b.payment_status || b.paymentStatus, b.deposit_tx || b.depositTx,
      b.escrow_wallet || b.escrowWallet, b.maintainer, b.maintainer_name || b.maintainerName,
      b.maintainer_email || b.maintainerEmail, b.solver, b.solver_type || b.solverType,
      b.pr_url || b.prUrl, b.description, b.created_at || b.createdAt,
      b.deadline, b.settled_at || b.settledAt || null, b.settlement_tx || b.settlementTx || null,
      b.reward_distribution || b.rewardDistribution || null,
      b.on_chain_bounty_id || b.onChainBountyId || null
    ]);
  } catch (err) {
    console.error('[Supabase] pgSaveBounty error:', err.message);
  }
}

export async function pgSaveSubmission(sub) {
  if (!pool || !sub) return;
  try {
    await pool.query(`
      INSERT INTO bounty_submissions (
        id, bounty_id, creator_id, user_id, creator_name, creator_email,
        wallet_address, submission_url, notes, solver_type, status,
        reward_paid, disbursement_tx, submitted_at, revision_count,
        revision_history, collaborators, score_code_quality, score_creativity,
        score_completeness, reviewer_notes, github_pr_status, submit_tx
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22, $23
      ) ON CONFLICT (id) DO UPDATE SET
        submission_url = EXCLUDED.submission_url,
        notes = EXCLUDED.notes,
        status = EXCLUDED.status,
        reward_paid = EXCLUDED.reward_paid,
        disbursement_tx = EXCLUDED.disbursement_tx,
        revision_count = EXCLUDED.revision_count,
        revision_history = EXCLUDED.revision_history,
        collaborators = EXCLUDED.collaborators,
        score_code_quality = EXCLUDED.score_code_quality,
        score_creativity = EXCLUDED.score_creativity,
        score_completeness = EXCLUDED.score_completeness,
        reviewer_notes = EXCLUDED.reviewer_notes,
        github_pr_status = EXCLUDED.github_pr_status,
        submit_tx = COALESCE(EXCLUDED.submit_tx, bounty_submissions.submit_tx)
    `, [
      sub.id, sub.bounty_id, sub.creator_id || sub.user_id, sub.user_id || sub.creator_id,
      sub.creator_name, sub.creator_email, sub.wallet_address, sub.submission_url,
      sub.notes || null, sub.solver_type || 'Human Creator', sub.status || 'submitted',
      sub.reward_paid || 0, sub.disbursement_tx || null, sub.submitted_at,
      sub.revision_count || 1,
      typeof sub.revision_history === 'string' ? sub.revision_history : JSON.stringify(sub.revision_history || []),
      typeof sub.collaborators === 'string' ? sub.collaborators : JSON.stringify(sub.collaborators || []),
      sub.score_code_quality || null, sub.score_creativity || null, sub.score_completeness || null,
      sub.reviewer_notes || null, sub.github_pr_status || null,
      sub.submit_tx || sub.submitTx || null
    ]);
  } catch (err) {
    console.error('[Supabase] pgSaveSubmission error:', err.message);
  }
}

export async function pgSaveDiscussion(disc) {
  if (!pool || !disc) return;
  try {
    await pool.query(`
      INSERT INTO bounty_discussions (
        id, bounty_id, user_id, author_name, author_handle, author_role, author_avatar, content, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
    `, [
      disc.id, disc.bounty_id, disc.user_id || null, disc.author_name, disc.author_handle || null,
      disc.author_role || 'creator', disc.author_avatar || null, disc.content, disc.created_at
    ]);
  } catch (err) {
    console.error('[Supabase] pgSaveDiscussion error:', err.message);
  }
}

export async function pgSaveDisbursement(d) {
  if (!pool || !d) return;
  try {
    await pool.query(`
      INSERT INTO disbursements (
        id, disbursement_id, bounty_id, submission_id, bounty_title,
        sponsor_name, sponsor_wallet, recipient_address, recipient_email,
        amount, amount_usdc, tx_hash, admin_email, distributed_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14
      ) ON CONFLICT (disbursement_id) DO NOTHING
    `, [
      d.id || d.disbursement_id, d.disbursement_id || d.id, d.bounty_id, d.submission_id || null,
      d.bounty_title || null, d.sponsor_name || null, d.sponsor_wallet || null,
      d.recipient_address, d.recipient_email || null,
      d.amount || d.amount_usdc, d.amount_usdc || d.amount, d.tx_hash,
      d.admin_email, d.distributed_at
    ]);
  } catch (err) {
    console.error('[Supabase] pgSaveDisbursement error:', err.message);
  }
}

export async function pgSaveSession(token, userId, expiresAt, createdAt) {
  if (!pool) return;
  try {
    await pool.query(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (token) DO UPDATE SET expires_at = EXCLUDED.expires_at
    `, [token, userId, expiresAt, createdAt]);
  } catch (err) {
    console.error('[Supabase] pgSaveSession error:', err.message);
  }
}

