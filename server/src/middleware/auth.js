import { getUserByToken } from '../db.js';

/**
 * Extract a session token from the Authorization header only.
 * Query-string and body tokens are deliberately never accepted.
 */
export function getBearerToken(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

/**
 * Resolve the authenticated session user, or null when unauthenticated.
 */
export function getSessionUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  return getUserByToken(token);
}

/**
 * Express middleware that requires a valid, unexpired user session.
 */
export function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in and retry.'
    });
  }
  req.user = user;
  req.authToken = getBearerToken(req);
  return next();
}
