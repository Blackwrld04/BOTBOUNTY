/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * It is intentionally dependency-free. For multi-instance deployments, replace
 * this with a shared store (Redis/Upstash) so limits apply across processes.
 */
const buckets = new Map();

let lastSweep = 0;

function sweep(now) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function clientKey(req) {
  // Express resolves req.ip from X-Forwarded-For only when TRUST_PROXY is
  // configured, so clients cannot spoof their bucket by sending the header.
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * @param {object} options
 * @param {number} [options.windowMs=60000]
 * @param {number} [options.max=30]
 * @param {string} [options.name='default']
 */
export function rateLimit({ windowMs = 60_000, max = 30, name = 'default' } = {}) {
  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    sweep(now);

    const key = `${name}:${clientKey(req)}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait a moment and try again.'
      });
    }

    return next();
  };
}
