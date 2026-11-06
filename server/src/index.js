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
    resolvedGitRevision = 'unknown';
  }
}

const app = express();
app.disable('x-powered-by');

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

const configuredOrigins = String(process.env.CORS_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const developmentOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];
const allowedOrigins = new Set([
  ...configuredOrigins,
  ...(config.nodeEnv === 'production' ? [] : developmentOrigins)
]);

app.use(cors({
  origin(origin, callback) {
    // Same-origin/server-to-server requests have no Origin header.
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.has(origin));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600
}));

app.use(express.json({
  limit: '256kb',
  verify(req, res, buffer) {
    // Preserve the exact bytes for GitHub HMAC verification.
    req.rawBody = Buffer.from(buffer);
  }
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_HSTS === 'true') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Routes
app.use('/api/auth', authRouter);
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
    timestamp: new Date().toISOString()
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
    timeoutAutoClaimEnabled: true,
    activeEscrowVerified: true,
    gitRevision: resolvedGitRevision,
    database: isExternalDbConfigured() ? 'Supabase PostgreSQL (Connection Pooling)' : 'Embedded SQLite',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error('[Server Error]', err.message);
  }
  return res.status(status).json({
    success: false,
    error: status === 400 ? 'Invalid request body.' : 'Internal server error'
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
