import { Router } from 'express';
import { recoverMessageAddress } from 'viem';
import { sendVerificationEmail } from '../email.js';
import {
  createVerificationCode,
  verifyCode,
  getUserByEmail,
  getUserByUsername,
  createUser,
  createSession,
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
  isValidEvmAddress,
  deleteSession,
  db
} from '../db.js';
import {
  isExternalDbConfigured,
  pgGetUserByIdentifier
} from '../supabase.js';
import { requireAuth, getSessionUser, getBearerToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const authRouter = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;
const DISCIPLINES = new Set(['Design', 'Content', 'Development', 'All Social', 'Other']);
const SOCIAL_PLATFORMS = new Set(['telegram', 'discord', 'x', 'github']);
const VERIFICATION_TYPES = new Set(['signup', 'login', 'reset']);

const loginLimiter = rateLimit({ name: 'auth-login', windowMs: 60_000, max: 10 });
const signupLimiter = rateLimit({ name: 'auth-signup', windowMs: 60 * 60_000, max: 5 });
const sendCodeLimiter = rateLimit({ name: 'auth-send-code', windowMs: 60_000, max: 5 });
const verifyCodeLimiter = rateLimit({ name: 'auth-verify-code', windowMs: 10 * 60_000, max: 15 });
const walletLimiter = rateLimit({ name: 'auth-wallet', windowMs: 60_000, max: 15 });
const profileLimiter = rateLimit({ name: 'auth-profile', windowMs: 60_000, max: 30 });

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return EMAIL_PATTERN.test(email) && email.length <= 254;
}

function cleanUsername(username) {
  return String(username || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9_-]/g, '');
}

function uniqueUsername(base) {
  const clean = cleanUsername(base) || 'creator';
  let candidate = clean.slice(0, 30);
  if (!USERNAME_PATTERN.test(candidate)) {
    candidate = `creator-${candidate}`.slice(0, 30);
  }
  let suffix = 0;
  while (getUserByUsername(candidate)) {
    suffix += 1;
    const suffixText = `-${suffix}`;
    candidate = `${candidate.slice(0, 30 - suffixText.length)}${suffixText}`;
  }
  return candidate;
}

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
 * Prevent verification-email bombing: one message per type per email each minute.
 */
function verificationRequestedTooRecently(email, type) {
  const cutoff = Date.now() - 60_000;
  const row = db.prepare(`
    SELECT id FROM verification_codes
    WHERE email = ? AND type = ? AND created_at > ?
    LIMIT 1
  `).get(email, type, cutoff);
  return Boolean(row);
}

function isValidAvatarUrl(value) {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string' || value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (e) {
    return false;
  }
}

/**
 * POST /api/auth/login
 * Password authentication. Users without a password must use the OTP flow.
 */
authRouter.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your email/username and password.'
      });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid credentials.' });
    }

    const identifier = email.trim().toLowerCase().replace(/^@/, '');
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

    if (!user || !user.password_hash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password. If you signed up with a wallet, use wallet sign-in.'
      });
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password. Please check your credentials.'
      });
    }

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
 * Creates a pending registration and emails a 6-digit OTP. The account is only
 * created after the code is verified.
 */
authRouter.post('/signup', signupLimiter, async (req, res) => {
  try {
    const { name, username, email, password, discipline } = req.body || {};

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ success: false, error: 'Password must be 8-128 characters long.' });
    }

    const finalUsername = cleanUsername(username || normalizedEmail.split('@')[0]);
    if (!USERNAME_PATTERN.test(finalUsername)) {
      return res.status(400).json({
        success: false,
        error: 'Handle must be 3-30 characters long and contain only letters, numbers, underscores or hyphens.'
      });
    }

    if (getUserByEmail(normalizedEmail)) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists. Please log in.'
      });
    }

    if (getUserByUsername(finalUsername)) {
      return res.status(409).json({
        success: false,
        error: `Username @${finalUsername} is already taken. Please choose another handle.`
      });
    }

    if (discipline !== undefined && !DISCIPLINES.has(discipline)) {
      return res.status(400).json({ success: false, error: 'Invalid specialty selected.' });
    }

    if (verificationRequestedTooRecently(normalizedEmail, 'signup')) {
      return res.status(429).json({
        success: false,
        error: 'A verification code was sent recently. Please wait a minute before requesting another.'
      });
    }

    const pendingData = {
      name: String(name || finalUsername).trim().slice(0, 80),
      username: finalUsername,
      discipline: discipline || 'Content',
      passwordHash: hashPassword(password)
    };

    const { code, expiresAt } = createVerificationCode(normalizedEmail, 'signup', pendingData);

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
      expiresAt,
      ...(process.env.NODE_ENV !== 'production' && emailResult.previewUrl
        ? { previewUrl: emailResult.previewUrl }
        : {})
    });
  } catch (err) {
    console.error('[Auth Error] signup failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to initiate signup process.' });
  }
});

/**
 * POST /api/auth/send-code
 * Sends a 6-digit verification OTP.
 *
 * Allowed types: `login` and `reset`. Signup codes are only issued by
 * /api/auth/signup so that pending profile data is always server-controlled.
 * Responses are intentionally generic for unknown accounts to avoid account
 * enumeration.
 */
authRouter.post('/send-code', sendCodeLimiter, async (req, res) => {
  try {
    const { email, type = 'login' } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (!['login', 'reset'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Unsupported verification type.' });
    }

    const genericResponse = {
      success: true,
      message: 'If an account exists for that email, a 6-digit verification code has been sent.',
      email: normalizedEmail,
      type
    };

    const existingUser = getUserByEmail(normalizedEmail);
    if (!existingUser) {
      return res.json(genericResponse);
    }

    if (verificationRequestedTooRecently(normalizedEmail, type)) {
      return res.status(429).json({
        success: false,
        error: 'A verification code was sent recently. Please wait a minute before requesting another.'
      });
    }

    const { code, expiresAt } = createVerificationCode(normalizedEmail, type);

    try {
      await sendVerificationEmail(normalizedEmail, code, type);
    } catch (mailErr) {
      console.warn('[Send-code Email Warning]:', mailErr.message);
    }

    return res.json({ ...genericResponse, expiresAt });
  } catch (err) {
    console.error('[Auth Error] send-code failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to dispatch verification email.' });
  }
});

/**
 * POST /api/auth/verify-code
 * Verifies a purpose-bound OTP and only then creates/activates the account or
 * resets the password.
 */
authRouter.post('/verify-code', verifyCodeLimiter, (req, res) => {
  try {
    const { email, code, type } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail) || !code) {
      return res.status(400).json({ success: false, error: 'Email and 6-digit code are required.' });
    }

    if (!VERIFICATION_TYPES.has(type)) {
      return res.status(400).json({ success: false, error: 'A valid verification type is required.' });
    }

    const verification = verifyCode(normalizedEmail, String(code), type);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: verification.error || 'Invalid or expired verification code'
      });
    }

    let user = getUserByEmail(normalizedEmail);

    if (type === 'signup') {
      if (user) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists. Please log in.'
        });
      }

      const pending = verification.pendingData;
      if (!pending || typeof pending !== 'object' || !pending.passwordHash || !pending.username) {
        return res.status(400).json({
          success: false,
          error: 'Registration data is missing or expired. Please sign up again.'
        });
      }

      if (getUserByUsername(pending.username)) {
        return res.status(409).json({
          success: false,
          error: `Username @${pending.username} is already taken. Please sign up with another handle.`
        });
      }

      user = createUser({
        email: normalizedEmail,
        name: pending.name,
        username: pending.username,
        provider: 'email',
        discipline: DISCIPLINES.has(pending.discipline) ? pending.discipline : 'Content',
        passwordHash: pending.passwordHash
      });
    } else if (type === 'reset') {
      if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
      }
      const { password } = req.body || {};
      if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
        return res.status(400).json({ success: false, error: 'New password must be 8-128 characters long.' });
      }
      updateUserPassword(user.id, password);
    } else {
      // login
      if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
      }
    }

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

// Backwards-compatible alias; both names hit the same secure handler.
authRouter.post('/verify-signup', verifyCodeLimiter, (req, res, next) => {
  req.url = '/verify-code';
  authRouter.handle(req, res, next);
});

/**
 * POST /api/auth/google
 * Accepts a real Google ID token (`credential` or `idToken`) and verifies it
 * with Google's tokeninfo endpoint. There is no client-supplied email path.
 *
 * Configure GOOGLE_CLIENT_ID (comma-separated allowed) to enable this route.
 */
authRouter.post('/google', loginLimiter, async (req, res) => {
  try {
    const credential = req.body?.credential || req.body?.idToken;
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ success: false, error: 'Google credential is required.' });
    }

    const configuredAudiences = String(process.env.GOOGLE_CLIENT_ID || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);

    if (configuredAudiences.length === 0) {
      return res.status(503).json({
        success: false,
        error: 'Google sign-in is not configured on this server.'
      });
    }

    const verificationRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!verificationRes.ok) {
      return res.status(401).json({ success: false, error: 'Google credential verification failed.' });
    }

    const payload = await verificationRes.json();
    const issuerValid = payload.iss === 'accounts.google.com' || payload.iss === 'https://accounts.google.com';
    const audienceValid = configuredAudiences.includes(payload.aud);
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    const notExpired = Number(payload.exp) * 1000 > Date.now();
    const normalizedGoogleEmail = normalizeEmail(payload.email);

    if (!issuerValid || !audienceValid || !emailVerified || !notExpired || !isValidEmail(normalizedGoogleEmail)) {
      return res.status(401).json({ success: false, error: 'Google credential verification failed.' });
    }

    let user = getUserByEmail(normalizedGoogleEmail);
    if (!user) {
      user = createUser({
        email: normalizedGoogleEmail,
        name: String(payload.name || normalizedGoogleEmail.split('@')[0]).slice(0, 80),
        username: uniqueUsername(normalizedGoogleEmail.split('@')[0]),
        avatar: typeof payload.picture === 'string' && payload.picture.startsWith('https://') ? payload.picture : undefined,
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
    return res.status(500).json({ success: false, error: 'Google authentication failed.' });
  }
});

authRouter.post('/google-callback', loginLimiter, (req, res, next) => {
  req.url = '/google';
  authRouter.handle(req, res, next);
});

/**
 * POST /api/auth/wallet
 * Removed: this route used to issue a session for any supplied address without
 * proof of ownership. Wallet sessions must be created through /wallet-verify,
 * which requires a valid personal_sign signature.
 */
authRouter.post('/wallet', walletLimiter, (req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Unsigned wallet login is no longer supported. Use wallet signature verification.'
  });
});

/**
 * GET /api/auth/me
 */
authRouter.get('/me', requireAuth, (req, res) => {
  try {
    const transactions = getUserDisbursements(req.user.email, req.user.wallet_address);
    return res.json({
      success: true,
      user: formatUser(req.user),
      transactions
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to authenticate user' });
  }
});

/**
 * POST /api/auth/logout
 * Revokes the presented session token. Idempotent: missing or unknown tokens
 * still return success so clients can always complete local sign-out.
 */
authRouter.post('/logout', (req, res) => {
  const token = getBearerToken(req);
  if (token) deleteSession(token);
  return res.json({ success: true, message: 'Signed out successfully.' });
});

/**
 * GET /api/auth/transactions
 * Always scoped to the authenticated session. Identity query parameters are
 * ignored so callers cannot read another creator's payouts.
 */
authRouter.get('/transactions', requireAuth, profileLimiter, (req, res) => {
  try {
    const transactions = getUserDisbursements(req.user.email, req.user.wallet_address);
    return res.json({ success: true, transactions });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve transactions' });
  }
});

/**
 * GET /api/auth/profile-stats
 * Always scoped to the authenticated session.
 */
authRouter.get('/profile-stats', requireAuth, profileLimiter, (req, res) => {
  try {
    if (req.query.userId && req.query.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You may only view your own profile stats.' });
    }

    const stats = getUserProfileStats(req.user.id, req.user.email, req.user.wallet_address);
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('[Auth Error] profile-stats failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve profile stats' });
  }
});

/**
 * GET /api/auth/wallet-nonce
 */
authRouter.get('/wallet-nonce', walletLimiter, (req, res) => {
  try {
    const { address } = req.query;
    if (!isValidEvmAddress(address)) {
      return res.status(400).json({ success: false, error: 'Valid EVM address required' });
    }

    const challenge = createWalletChallenge(address);
    return res.json({ success: true, ...challenge });
  } catch (err) {
    console.error('[Auth Error] wallet-nonce failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate cryptographic challenge' });
  }
});

/**
 * POST /api/auth/wallet-verify
 * Verifies an EIP-191 personal_sign signature. When an Authorization header is
 * present, the verified wallet is linked to that session's user. Without one,
 * the route performs wallet-only sign-in/registration.
 */
authRouter.post('/wallet-verify', walletLimiter, async (req, res) => {
  try {
    const { address, signature, nonce } = req.body || {};

    if (!isValidEvmAddress(address) || !signature || !nonce) {
      return res.status(400).json({
        success: false,
        error: 'A valid address, cryptographic signature, and nonce are required.'
      });
    }

    const authHeader = req.headers.authorization;
    let authUser = null;
    if (authHeader) {
      authUser = getSessionUser(req);
      if (!authUser) {
        return res.status(401).json({ success: false, error: 'Invalid or expired session.' });
      }
    }

    const challengeCheck = verifyWalletChallenge(address, nonce);
    if (!challengeCheck.valid) {
      return res.status(400).json({ success: false, error: challengeCheck.error });
    }

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

    let user = null;
    if (authUser) {
      user = updateUserWallet(authUser.id, address);
    } else {
      user = getUserByWalletAddress(address);
      if (!user) {
        const pseudoEmail = `${address.toLowerCase()}@wallet.botbounty`;
        const existingPseudo = getUserByEmail(pseudoEmail);
        if (existingPseudo) {
          return res.status(409).json({
            success: false,
            error: 'This wallet is associated with a legacy account. Please contact support.'
          });
        }
        user = createUser({
          email: pseudoEmail,
          name: `Arc Creator (${address.slice(0, 6)}...${address.slice(-4)})`,
          username: uniqueUsername(`arc-${address.slice(2, 10)}`),
          provider: 'wallet',
          walletAddress: address
        });
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
    const message = err.message && err.message.includes('already linked')
      ? err.message
      : 'Cryptographic verification error.';
    return res.status(err.message && err.message.includes('already linked') ? 409 : 500).json({
      success: false,
      error: message
    });
  }
});

/**
 * POST /api/auth/social-connect
 * Links or unlinks Telegram, Discord, X, or GitHub for the authenticated user.
 */
authRouter.post('/social-connect', requireAuth, profileLimiter, async (req, res) => {
  try {
    const { platform, handle, action = 'connect' } = req.body || {};

    if (!SOCIAL_PLATFORMS.has(platform)) {
      return res.status(400).json({ success: false, error: 'Unsupported social platform.' });
    }

    if (action === 'disconnect') {
      const updatedUser = updateUserSocial(req.user.id, platform, null);
      return res.json({ success: true, user: formatUser(updatedUser) });
    }

    if (action !== 'connect') {
      return res.status(400).json({ success: false, error: 'Unsupported social action.' });
    }

    const cleanHandle = String(handle || '').trim().replace(/^@/, '');
    if (!cleanHandle || cleanHandle.length > 64 || !/^[A-Za-z0-9_.-]+$/.test(cleanHandle)) {
      return res.status(400).json({ success: false, error: 'Handle is invalid.' });
    }

    if (platform === 'github') {
      try {
        const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanHandle)}`, {
          headers: {
            'User-Agent': 'ArcBounty-Verification-Engine',
            'Accept': 'application/vnd.github+json'
          },
          signal: AbortSignal.timeout(8000)
        });
        if (ghRes.status === 404) {
          return res.status(404).json({
            success: false,
            error: `GitHub account "@${cleanHandle}" does not exist. Please check the username.`
          });
        }
        if (!ghRes.ok) {
          return res.status(502).json({
            success: false,
            error: 'GitHub verification is temporarily unavailable. Please try again.'
          });
        }
      } catch (e) {
        return res.status(502).json({
          success: false,
          error: 'GitHub verification is temporarily unavailable. Please try again.'
        });
      }
    }

    const updatedUser = updateUserSocial(req.user.id, platform, cleanHandle);
    return res.json({ success: true, user: formatUser(updatedUser) });
  } catch (err) {
    console.error('[Auth Error] social-connect failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to update social connection' });
  }
});

/**
 * POST /api/auth/connect-wallet
 * Removed: unverified wallet changes are not permitted. Use /wallet-verify with
 * a signed challenge while authenticated.
 */
authRouter.post('/connect-wallet', walletLimiter, (req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Wallet changes require a signed challenge. Use wallet signature verification.'
  });
});

/**
 * POST /api/auth/update-profile
 * Self-service profile updates only; the user ID always comes from the session.
 */
authRouter.post('/update-profile', requireAuth, profileLimiter, (req, res) => {
  try {
    const { name, username, bio, discipline, avatar } = req.body || {};

    if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 80)) {
      return res.status(400).json({ success: false, error: 'Name must be 1-80 characters.' });
    }

    if (bio !== undefined && (typeof bio !== 'string' || bio.length > 500)) {
      return res.status(400).json({ success: false, error: 'Bio must be 500 characters or fewer.' });
    }

    if (discipline !== undefined && !DISCIPLINES.has(discipline)) {
      return res.status(400).json({ success: false, error: 'Invalid specialty selected.' });
    }

    if (!isValidAvatarUrl(avatar)) {
      return res.status(400).json({ success: false, error: 'Avatar must be a valid HTTP(S) URL.' });
    }

    const updatedUser = updateUserProfile(req.user.id, {
      name: name !== undefined ? name.trim() : undefined,
      username,
      bio: bio !== undefined ? bio.trim() : undefined,
      discipline,
      avatar
    });

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
 */
authRouter.get('/check-username', profileLimiter, (req, res) => {
  try {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username parameter is required.' });
    }

    const clean = cleanUsername(username);
    if (!USERNAME_PATTERN.test(clean)) {
      return res.json({
        success: true,
        available: false,
        username: clean,
        message: 'Handle must be 3-30 characters long (letters, numbers, _, -).'
      });
    }

    const sessionUser = getSessionUser(req);
    const existing = getUserByUsername(clean);
    const isTaken = Boolean(existing && (!sessionUser || existing.id !== sessionUser.id));

    return res.json({
      success: true,
      available: !isTaken,
      username: clean,
      message: isTaken
        ? `Creator handle "@${clean}" is already taken.`
        : `Creator handle "@${clean}" is available!`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to check username availability.' });
  }
});
