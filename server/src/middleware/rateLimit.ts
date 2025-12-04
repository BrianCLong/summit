import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../services/RateLimiter.js';
import { quotaEnforcer } from '../lib/resources/QuotaEnforcer.js';
import { cfg } from '../config.js';

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

  // @ts-ignore - req.user is populated by auth middleware
  const user = req.user;
  const tenantId = user?.tenantId;

  // Use QuotaEnforcer for authenticated tenants
  if (tenantId) {
    const quotaResult = await quotaEnforcer.checkApiQuota(tenantId);

    // Set headers
    res.set('X-RateLimit-Limit', String(quotaResult.limit));
    res.set('X-RateLimit-Remaining', String(quotaResult.remaining));
    res.set('X-RateLimit-Reset', String(Math.ceil(quotaResult.reset / 1000)));

    if (!quotaResult.allowed) {
      res.status(429).json({
        error: 'Quota Exceeded',
        message: 'You have exceeded your API request quota for this minute.',
        retryAfter: Math.ceil((quotaResult.reset - Date.now()) / 1000),
        reason: quotaResult.reason
      });
      return;
    }

    return next();
  }

  // Fallback to IP-based rate limiting for unauthenticated requests
  let key = `ip:${req.ip}`;
  let limit = cfg.RATE_LIMIT_MAX_REQUESTS;
  const windowMs = cfg.RATE_LIMIT_WINDOW_MS;

  // Custom limits for expensive operations (Restored logic)
  if (req.originalUrl.includes('/graphql') || req.baseUrl.endsWith('/graphql')) {
      key += ':graphql';
      // Use standard limit but separate bucket
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
    res.status(429).json({
      error: 'Too many requests, please try again later',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
    });
    return;
  }

  next();
};
