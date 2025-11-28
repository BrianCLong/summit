import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../services/RateLimiter.js';
import { cfg } from '../config.js';

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  scope?: string;
  keyGenerator?: (req: Request) => string;
}

const defaultKeyGenerator = (req: Request) => {
  // @ts-ignore - req.user is populated by auth middleware when available
  const user = req.user;
  if (user) {
    return `user:${user.id || user.sub}`;
  }
  return `ip:${req.ip}`;
};

/**
 * Configurable rate limiting middleware backed by Redis.
 * Prioritizes authenticated user limits over IP limits and supports scoped buckets.
 */
export const createRateLimitMiddleware = (
  options: RateLimitOptions = {},
) =>
  async (req: Request, res: Response, next: NextFunction) => {
    // Skip if it's a health check (usually handled before, but safe to check)
    if (req.path === '/health' || req.path === '/ping') {
      return next();
    }

    const scope = options.scope ?? 'api';
    const windowMs = options.windowMs ?? cfg.RATE_LIMIT_WINDOW_MS;
    const keyBuilder = options.keyGenerator ?? defaultKeyGenerator;

    // Determine key and limit
    let key = keyBuilder(req);
    let limit = options.max ?? (key.startsWith('user:')
      ? cfg.RATE_LIMIT_MAX_AUTHENTICATED
      : cfg.RATE_LIMIT_MAX_REQUESTS);

    // Custom limits for expensive operations
    // Note: When mounted on a path, req.path is relative. Use originalUrl or check baseUrl.
    if (req.originalUrl.includes('/graphql') || req.baseUrl.endsWith('/graphql')) {
      key += ':graphql';
    } else if (req.path.startsWith('/api/ai')) {
      key += ':ai';
      limit = Math.floor(limit / 5);
    }

    const result = await rateLimiter.checkLimit(key, limit, windowMs, { prefix: scope });

    // Set standard headers
    res.set('X-RateLimit-Limit', String(result.total));
    res.set('X-RateLimit-Remaining', String(result.remaining));
    res.set('X-RateLimit-Reset', String(Math.ceil(result.reset / 1000)));
    res.set('Retry-After', String(Math.max(Math.ceil((result.reset - Date.now()) / 1000), 0)));

    if (!result.allowed) {
      res.status(429).json({
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      });
      return;
    }

    next();
  };

// Default middleware used across the app
export const rateLimitMiddleware = createRateLimitMiddleware();
