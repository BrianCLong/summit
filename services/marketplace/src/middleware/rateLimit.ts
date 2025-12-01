import type { Request, Response, NextFunction } from 'express';
import { cache } from '../utils/cache.js';
import type { AuthenticatedRequest } from './auth.js';

interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix?: string;
}

// Rate limiting middleware factory
export function rateLimit(config: RateLimitConfig) {
  const { windowSeconds, maxRequests, keyPrefix = 'ratelimit' } = config;

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Use user ID if authenticated, otherwise IP
    const identifier = req.user?.id || req.ip || 'anonymous';
    const key = `${keyPrefix}:${identifier}`;

    try {
      const { allowed, remaining } = await cache.checkRateLimit(
        key,
        maxRequests,
        windowSeconds
      );

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + windowSeconds);

      if (!allowed) {
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: windowSeconds,
        });
        return;
      }

      next();
    } catch {
      // If rate limiting fails, allow the request (fail open)
      next();
    }
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  // General API: 100 requests per minute
  api: rateLimit({
    windowSeconds: 60,
    maxRequests: 100,
    keyPrefix: 'rl:api',
  }),

  // Search: 30 requests per minute
  search: rateLimit({
    windowSeconds: 60,
    maxRequests: 30,
    keyPrefix: 'rl:search',
  }),

  // Transactions: 10 per minute
  transactions: rateLimit({
    windowSeconds: 60,
    maxRequests: 10,
    keyPrefix: 'rl:tx',
  }),

  // Data downloads: 5 per minute
  downloads: rateLimit({
    windowSeconds: 60,
    maxRequests: 5,
    keyPrefix: 'rl:dl',
  }),

  // Auth: 5 attempts per minute
  auth: rateLimit({
    windowSeconds: 60,
    maxRequests: 5,
    keyPrefix: 'rl:auth',
  }),
};
