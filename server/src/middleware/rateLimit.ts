import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../services/RateLimiter.js';
import { cfg } from '../config.js';
import { logger } from '../shared/logging/index.js';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

/**
 * Rate limiting middleware.
 * Prioritizes authenticated user limits over IP limits.
 */
export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip if it's a health check (usually handled before, but safe to check)
  if (req.path === '/health' || req.path === '/ping') {
    return next();
  }

  let key: string;
  let limit: number;
  let windowMs = cfg.RATE_LIMIT_WINDOW_MS;

  // Determine key and limit
  // @ts-ignore - req.user is populated by auth middleware
  const user = req.user;

  if (user) {
    key = `user:${user.id || user.sub}`;
    // Higher limit for authenticated users
    limit = cfg.RATE_LIMIT_MAX_AUTHENTICATED;
  } else {
    key = `ip:${req.ip}`;
    limit = cfg.RATE_LIMIT_MAX_REQUESTS;
  }

  // Custom limits for expensive operations
  // Note: When mounted on a path, req.path is relative. Use originalUrl or check baseUrl.
  if (req.originalUrl.includes('/graphql') || req.baseUrl.endsWith('/graphql')) {
      // Basic check, ideally we parse query complexity, but we can set a separate bucket
      key += ':graphql';
      // Maybe stricter or separate limit?
      // For now we use the same limit but separate bucket to avoid starving other API calls
  } else if (req.path.startsWith('/api/ai')) {
      key += ':ai';
      limit = Math.floor(limit / 5); // 5x stricter for AI endpoints
  }

  const result = await rateLimiter.checkLimit(key, limit, windowMs);

  // Set standard headers
  res.set('X-RateLimit-Limit', String(result.total));
  res.set('X-RateLimit-Remaining', String(result.remaining));
  res.set('X-RateLimit-Reset', String(Math.ceil(result.reset / 1000)));

  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    res.set('Retry-After', String(retryAfter));

    // Alerting hook: log warning with metadata for log-based alerts
    logger.warn({
      key,
      limit,
      remaining: result.remaining,
      ip: req.ip,
      path: req.originalUrl,
      userId: user?.id || user?.sub
    }, 'Rate limit exceeded');

    res.status(429).json({
      error: 'Too many requests, please try again later',
      retryAfter
    });
    return;
  }

  next();
};
