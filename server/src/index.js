import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { bountyRouter } from './routes/bounties.js';
import { statsRouter } from './routes/stats.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { initSupabaseDatabase, isExternalDbConfigured } from './supabase.js';
import { db, INITIAL_BOUNTIES } from './db.js';

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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    network: 'BOT Chain (968 / 677)',
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

