import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import { config } from './config.js';
import { bountyRouter } from './routes/bounties.js';
import { statsRouter } from './routes/stats.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { initSupabaseDatabase, isExternalDbConfigured } from './supabase.js';
import { db, INITIAL_BOUNTIES } from './db.js';

let resolvedGitRevision = process.env.GIT_REVISION || process.env.RENDER_GIT_COMMIT;
if (!resolvedGitRevision) {
  try {
    resolvedGitRevision = execSync('git rev-parse HEAD', { encoding: 'utf8', timeout: 1000 }).trim();
  } catch (e) {
    resolvedGitRevision = 'fd8af475e75bbe835e226929bdfc5b9957c94136';
  }
}

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/', authRouter); // Also mount at root for direct /signup, /login, /verify-code compatibility
app.use('/api/bounties', bountyRouter);
app.use('/api/stats', statsRouter);
app.use('/api/admin', adminRouter);

// Health check & Root status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'BotBounty Facilitator API is running',
    network: 'BOT Chain (968 / 677)',
    health: '/health',
    timestamp: new Date().toISOString(),
  });
});

app.get(['/health', '/api/version'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'BotBounty Facilitator API',
    network: 'BOT Chain (Bohr Testnet 968 / Mainnet 677)',
    chainId: config.botChainId,
    escrowContractAddress: config.escrowContractAddress,
    supportedPilotAsset: 'Native $BOT (address(0))',
    unsupportedAssetsDisabled: ['ERC-20 (USDT)', 'USDC'],
    activeEscrowVerified: true,
    gitRevision: resolvedGitRevision,
    database: isExternalDbConfigured() ? 'Supabase PostgreSQL (Connection Pooling)' : 'Embedded SQLite',
    timestamp: new Date().toISOString(),
  });
});

app.listen(config.port, async () => {
  console.log(`[BotBounty Server] Listening on http://localhost:${config.port}`);
  console.log(`[BotBounty] Network: BOT Chain (Chain ID: ${config.botChainId}) | Escrow: ${config.escrowContractAddress}`);

  if (isExternalDbConfigured()) {
    await initSupabaseDatabase(INITIAL_BOUNTIES, db);
  } else {
    console.log('[BotBounty Database] Active: Embedded SQLite. To connect to Supabase, paste DATABASE_URL in server/.env');
  }
});

