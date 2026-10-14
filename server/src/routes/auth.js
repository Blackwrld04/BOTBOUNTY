import { Router } from 'express';
import { recoverMessageAddress } from 'viem';
import { sendVerificationEmail } from '../email.js';
import {
  createVerificationCode,
  verifyCode,
  getUserByEmail,
  getUserByUsername,
  getUserById,
  createUser,
  createSession,
  getUserByToken,
  updateUserSocial,
  updateUserWallet,
  updateUserProfile,
  createWalletChallenge,
  verifyWalletChallenge,
  getUserByWalletAddress,
  hashPassword,
  verifyPassword,
  updateUserPassword,
  getUserDisbursements,
  getUserProfileStats,
  db
} from '../db.js';
import {
  isExternalDbConfigured,
  pgGetUserByIdentifier
} from '../supabase.js';

export const authRouter = Router();

function formatUser(user) {
  if (!user) return null;
  const isAdmin = Boolean(user.is_admin);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    address: user.wallet_address,
    balance: user.usdc_balance,
    role: isAdmin ? 'admin' : (user.role || 'creator'),
    isAdmin,
    discipline: user.discipline,
    bio: user.bio,
    telegram: user.telegram,
    discord: user.discord,
    x: user.x,
    github: user.github,
    provider: user.provider
  };
}

/**
 * POST /api/auth/login
 * Standard credential authentication: Email (or Username) + Password
 */
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your email/username and password.'
      });
    }

    const identifier = email.trim().toLowerCase();
    let user = getUserByEmail(identifier) || getUserByUsername(identifier);

    // If not found in local SQLite cache, attempt lookup in Supabase PostgreSQL
    if (!user && isExternalDbConfigured()) {
      try {
        const pgUser = await pgGetUserByIdentifier(identifier);
        if (pgUser) {
          const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO users (
              id, email, name, username, avatar, wallet_address, usdc_balance,
              provider, role, discipline, bio, telegram, discord, x, github, password_hash, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          insertStmt.run(
            pgUser.id,
            (pgUser.email || '').toLowerCase().trim(),
            pgUser.name || 'User',
            pgUser.username || (pgUser.email ? pgUser.email.split('@')[0] : pgUser.id),
            pgUser.avatar || null,
            pgUser.wallet_address || null,
            Number(pgUser.usdc_balance || 0),
            pgUser.provider || 'email',
            pgUser.role || 'creator',
            pgUser.discipline || 'Content',
            pgUser.bio || null,
            pgUser.telegram || null,
            pgUser.discord || null,
            pgUser.x || null,
            pgUser.github || null,
            pgUser.password_hash || null,
            Number(pgUser.created_at || Date.now())
          );
          user = getUserByEmail(identifier) || getUserByUsername(identifier);
        }
      } catch (err) {
        console.warn('[Auth] Fallback Supabase lookup error:', err.message);
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password. Please check your credentials.'
      });
    }

    // Check if user has a password configured
    if (!user.password_hash) {
      // Legacy user without password: set their password to what was provided
      updateUserPassword(user.id, password);
    } else {
      const isValid = verifyPassword(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password. Please check your credentials.'
        });
      }
    }

    // Generate persistent session
    const { token } = createSession(user.id);

    return res.json({
      success: true,
      message: 'Logged in successfully',
      user: formatUser(user),
      token
    });
  } catch (err) {
    console.error('[Auth Error] login failed:', err);
    return res.status(500).json({ success: false, error: 'Internal authentication error' });
  }
});

/**
 * POST /api/auth/signup
 * Standard registration: validates fields, hashes password, and dispatches 6-digit email OTP
 */
authRouter.post('/signup', async (req, res) => {
  try {
    const { name, username, email, password, discipline } = req.body;

    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanUsername = (username || normalizedEmail.split('@')[0])
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');

    // Check if email already registered
    const existingUser = getUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists. Please log in.'
      });
    }

    // Check if username already taken
    const existingUsername = getUserByUsername(cleanUsername);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        error: `Username @${cleanUsername} is already taken. Please choose another handle.`
      });
    }

    // Securely hash password
    const passwordHash = hashPassword(password);

    // Save pending registration data in verification_codes
    const pendingData = {
      name: (name || cleanUsername).trim(),
      username: cleanUsername,
      discipline: discipline || 'Content',
      passwordHash
    };

    const { code, expiresAt } = createVerificationCode(normalizedEmail, 'signup', pendingData);

    // Dispatch email via Gmail SMTP or fallback
    let emailResult = { dispatched: false, previewUrl: null };
    try {
      emailResult = await sendVerificationEmail(normalizedEmail, code, 'signup');
    } catch (mailErr) {
      console.warn('[Signup Email Warning]:', mailErr.message);
    }

    return res.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${normalizedEmail}. Please check your inbox or spam folder.`,
      email: normalizedEmail,
      previewUrl: emailResult.previewUrl || null,
      expiresAt
    });
  } catch (err) {
    console.error('[Auth Error] signup failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to initiate signup process: ' + err.message });
  }
});

/**
 * POST /api/auth/send-code
 * Sends a 6-digit verification OTP for passwordless login or password reset
 */
authRouter.post('/send-code', async (req, res) => {
  try {
    const { email, type = 'login' } = req.body;

    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = getUserByEmail(normalizedEmail);

    // If login mode and account doesn't exist, inform user
    if (type === 'login' && !existingUser) {
      return res.status(404).json({
        success: false,
        userExists: false,
        error: 'No account found with this email. Please create an account first.'
      });
    }

    // Generate genuine 6-digit code
    const { code, expiresAt } = createVerificationCode(normalizedEmail, type);

    // Dispatch email via nodemailer or fallback
    let emailResult = { dispatched: false, previewUrl: null };
    try {
      emailResult = await sendVerificationEmail(normalizedEmail, code, type);
    } catch (mailErr) {
      console.warn('[Send-code Email Warning]:', mailErr.message);
    }

    return res.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${normalizedEmail}. Please check your inbox or spam folder.`,
      email: normalizedEmail,
      type,
      previewUrl: emailResult.previewUrl || null,
      expiresAt
    });
  } catch (err) {
    console.error('[Auth Error] send-code failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to dispatch verification email: ' + err.message });
  }
});

/**
 * POST /api/auth/verify-code
 * Verifies 6-digit OTP code, creates or activates account with hashed password, and logs in
 */
authRouter.post('/verify-code', (req, res) => {
  try {
    const { email, code, name, username, discipline, password } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and 6-digit code are required' });
    }

    const verification = verifyCode(email, code);
    if (!verification.valid) {
      return res.status(400).json({ success: false, error: verification.error || 'Invalid or expired verification code' });
    }

    let user = getUserByEmail(email);

    // If user does not exist yet, finalize registration with pending data
    if (!user) {
      const pending = verification.pendingData || {};
      const finalName = pending.name || name || email.split('@')[0];
      const finalUsername = pending.username || username || email.split('@')[0];
      const finalDiscipline = pending.discipline || discipline || 'Content';
      const finalPasswordHash = pending.passwordHash || (password ? hashPassword(password) : null);

      user = createUser({
        email,
        name: finalName,
        username: finalUsername,
        provider: 'email',
        discipline: finalDiscipline,
        passwordHash: finalPasswordHash
      });
    } else if (password) {
      // If user exists and provided a password (e.g. password reset flow)
      updateUserPassword(user.id, password);
    }

    // Create persistent session
    const { token } = createSession(user.id);

    return res.json({
      success: true,
      message: 'Email verified successfully! Welcome to BotBounty.',
      user: formatUser(user),
      token
    });
  } catch (err) {
    console.error('[Auth Error] verify-code failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to verify code' });
  }
});

// Alias for verify-code
authRouter.post('/verify-signup', (req, res, next) => {
  req.url = '/verify-code';
  authRouter.handle(req, res, next);
});

/**
 * POST /api/auth/google
 * Verified Google OAuth handler
 */
authRouter.post('/google', (req, res) => {
  try {
    const { email, name, avatar } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Google email is required' });
    }

    let user = getUserByEmail(email);

    if (!user) {
      user = createUser({
        email,
        name: name || email.split('@')[0],
        username: email.split('@')[0],
        avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        provider: 'google',
        discipline: 'Design'
      });
    }

    const { token } = createSession(user.id);

    return res.json({
      success: true,
      user: formatUser(user),
      token
    });
  } catch (err) {
    console.error('[Auth Error] Google login failed:', err);
    return res.status(500).json({ success: false, error: 'Google authentication failed' });
  }
});

authRouter.post('/google-callback', (req, res, next) => {
  req.url = '/google';
  authRouter.handle(req, res, next);
});

/**
 * POST /api/auth/wallet
 * Web3 wallet connection login
 */
authRouter.post('/wallet', (req, res) => {
  try {
    const { address } = req.body;

    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ success: false, error: 'Valid EVM address required' });
    }

    const normalizedAddress = address.toLowerCase();
    const fakeEmail = `${normalizedAddress.slice(2, 10)}@arc.user`;

    let user = getUserByEmail(fakeEmail);

    if (!user) {
      user = createUser({
        email: fakeEmail,
        name: `Arc Creator (${address.slice(0, 6)}...${address.slice(-4)})`,
        username: `arc-${address.slice(2, 8).toLowerCase()}`,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        provider: 'wallet'
      });
    }

    const { token } = createSession(user.id);

    return res.json({
      success: true,
      user: formatUser(user),
      token
    });
  } catch (err) {
    console.error('[Auth Error] Wallet login failed:', err);
    return res.status(500).json({ success: false, error: 'Wallet login failed' });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current session user
 */
authRouter.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'No authorization token' });
    }

    const user = getUserByToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }

    const transactions = getUserDisbursements(user.email, user.wallet_address);

    return res.json({
      success: true,
      user: formatUser(user),
      transactions
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to authenticate user' });
  }
});

/**
 * GET /api/auth/transactions
 * Retrieves collected bounty payouts and transactions for the creator
 */
authRouter.get('/transactions', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    let user = null;
    if (token) {
      user = getUserByToken(token);
    }

    const email = req.query.email || (user ? user.email : null);
    const address = req.query.address || (user ? user.wallet_address : null);

    const transactions = getUserDisbursements(email, address);
    return res.json({
      success: true,
      transactions
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve transactions' });
  }
});

/**
 * GET /api/auth/profile-stats
 * Returns accurate user stats (earnings, submissions count, wins count, submissions list)
 */
authRouter.get('/profile-stats', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    let user = null;
    if (token) {
      user = getUserByToken(token);
    }

    const userId = req.query.userId || (user ? user.id : null);
    const email = req.query.email || (user ? user.email : null);
    const address = req.query.address || (user ? user.wallet_address : null);

    const stats = getUserProfileStats(userId, email, address);
    return res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('[Auth Error] profile-stats failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve profile stats' });
  }
});

/**
 * GET /api/auth/wallet-nonce
 * Generates an authentic EIP-4361 cryptographic challenge for the connecting wallet
 */
authRouter.get('/wallet-nonce', (req, res) => {
  try {
    const { address } = req.query;
    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ success: false, error: 'Valid EVM address required' });
    }

    const challenge = createWalletChallenge(address);
    return res.json({
      success: true,
      ...challenge
    });
  } catch (err) {
    console.error('[Auth Error] wallet-nonce failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate cryptographic challenge' });
  }
});

/**
 * POST /api/auth/wallet-verify
 * Cryptographically verifies EVM personal_sign signature using viem recoverMessageAddress
 */
authRouter.post('/wallet-verify', async (req, res) => {
  try {
    const { address, signature, nonce } = req.body;
    if (!address || !signature || !nonce) {
      return res.status(400).json({ success: false, error: 'Address, cryptographic signature, and nonce are required' });
    }

    const challengeCheck = verifyWalletChallenge(address, nonce);
    if (!challengeCheck.valid) {
      return res.status(400).json({ success: false, error: challengeCheck.error });
    }

    // Cryptographic signature recovery via viem
    const recoveredAddress = await recoverMessageAddress({
      message: challengeCheck.message,
      signature
    });

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: 'Cryptographic signature verification failed. Address mismatch.'
      });
    }

    // Check if request is from an existing authenticated user session
    const authHeader = req.headers.authorization;
    let authUser = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authUser = getUserByToken(authHeader.split(' ')[1]);
    }
    if (!authUser && req.body.userId) {
      authUser = getUserById(req.body.userId);
    }

    let user = null;
    if (authUser) {
      // User is already logged in: link this verified EVM wallet to their existing account
      user = updateUserWallet(authUser.id, address);
    } else {
      // Standalone wallet sign-in: check if user exists with this wallet
      user = getUserByWalletAddress(address);
      if (!user) {
        // First-time wallet sign-in: register user
        const fakeEmail = `${address.slice(2, 10).toLowerCase()}@arc.user`;
        user = createUser({
          email: fakeEmail,
          name: `Arc Creator (${address.slice(0, 6)}...${address.slice(-4)})`,
          username: `arc-${address.slice(2, 8).toLowerCase()}`,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          provider: 'wallet'
        });
        user = updateUserWallet(user.id, address);
      }
    }

    const { token } = createSession(user.id);

    return res.json({
      success: true,
      user: formatUser(user),
      token
    });
  } catch (err) {
    console.error('[Auth Error] wallet-verify failed:', err);
    return res.status(500).json({ success: false, error: 'Cryptographic verification error: ' + err.message });
  }
});

/**
 * POST /api/auth/social-connect
 * Links or unlinks Telegram, Discord, X, or GitHub with live validation
 */
authRouter.post('/social-connect', async (req, res) => {
  try {
    const { userId, platform, handle, action = 'connect' } = req.body;
    if (!userId || !platform) {
      return res.status(400).json({ success: false, error: 'User ID and platform are required' });
    }

    if (action === 'disconnect') {
      const updatedUser = updateUserSocial(userId, platform, null);
      return res.json({ success: true, user: formatUser(updatedUser) });
    }

    const cleanHandle = handle ? handle.trim().replace(/^@/, '') : '';
    if (!cleanHandle) {
      return res.status(400).json({ success: false, error: 'Handle cannot be empty' });
    }

    // Real GitHub API live verification
    if (platform === 'github') {
      try {
        const ghRes = await fetch(`https://api.github.com/users/${cleanHandle}`, {
          headers: { 'User-Agent': 'ArcBounty-Verification-Engine' }
        });
        if (ghRes.status === 404) {
          return res.status(404).json({
            success: false,
            error: `GitHub account "@${cleanHandle}" does not exist. Please check the username.`
          });
        }
      } catch (e) {
        console.warn('[Social Auth] GitHub API network warning:', e.message);
      }
    }

    const updatedUser = updateUserSocial(userId, platform, cleanHandle);
    return res.json({ success: true, user: formatUser(updatedUser) });
  } catch (err) {
    console.error('[Auth Error] social-connect failed:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update social connection' });
  }
});

/**
 * POST /api/auth/connect-wallet
 * Connects or switches EVM wallet address for user
 */
authRouter.post('/connect-wallet', (req, res) => {
  try {
    const { userId, address } = req.body;
    if (!userId || !address) {
      return res.status(400).json({ success: false, error: 'User ID and address are required' });
    }

    const updatedUser = updateUserWallet(userId, address);
    return res.json({ success: true, user: formatUser(updatedUser) });
  } catch (err) {
    console.error('[Auth Error] connect-wallet failed:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to connect wallet' });
  }
});

/**
 * POST /api/auth/update-profile
 * Updates creator profile details
 */
authRouter.post('/update-profile', (req, res) => {
  try {
    const { userId, name, username, bio, discipline, avatar } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const updatedUser = updateUserProfile(userId, { name, username, bio, discipline, avatar });
    return res.json({ success: true, user: formatUser(updatedUser) });
  } catch (err) {
    console.error('[Auth Error] update-profile failed:', err.message);
    const isConflict = err.message && (err.message.includes('already taken') || err.message.includes('UNIQUE constraint'));
    return res.status(isConflict ? 409 : 400).json({
      success: false,
      error: err.message.includes('UNIQUE constraint')
        ? 'Creator handle is already taken by another creator.'
        : err.message
    });
  }
});

/**
 * GET /api/auth/check-username
 * Real-time endpoint to check if a creator handle is available
 */
authRouter.get('/check-username', (req, res) => {
  try {
    const { username, userId } = req.query;
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username parameter is required' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_-]/g, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      return res.json({
        success: true,
        available: false,
        username: cleanUsername,
        message: 'Handle must be at least 3 characters long (letters, numbers, _, -).'
      });
    }

    const existing = getUserByUsername(cleanUsername);
    const isTaken = Boolean(existing && (!userId || existing.id !== userId));

    return res.json({
      success: true,
      available: !isTaken,
      username: cleanUsername,
      message: isTaken
        ? `Creator handle "@${cleanUsername}" is already taken.`
        : `Creator handle "@${cleanUsername}" is available!`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
