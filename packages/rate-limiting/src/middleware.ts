/**
 * Rate Limiting Middleware
 *
 * Express middleware for rate limiting
 */

import type { Request, Response, NextFunction } from 'express';
import { RateLimiter } from './rate-limiter.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('rate-limit-middleware');

export interface RateLimitMiddlewareOptions {
  limiter: RateLimiter;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  onLimitReached?: (req: Request, res: Response) => void;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions) {
  const {
    limiter,
    keyGenerator = (req) => req.ip || 'unknown',
    skip = () => false,
    standardHeaders = true,
    legacyHeaders = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);

    try {
      const result = await limiter.checkLimit(key);

      // Set rate limit headers
      if (standardHeaders) {
        res.setHeader('RateLimit-Limit', result.info.limit);
        res.setHeader('RateLimit-Remaining', result.info.remaining);
        res.setHeader('RateLimit-Reset', new Date(result.info.resetTime).toISOString());
      }

      if (legacyHeaders) {
        res.setHeader('X-RateLimit-Limit', result.info.limit);
        res.setHeader('X-RateLimit-Remaining', result.info.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.info.resetTime / 1000));
      }

      if (!result.allowed) {
        if (result.retryAfter) {
          res.setHeader('Retry-After', result.retryAfter);
        }

        if (options.onLimitReached) {
          options.onLimitReached(req, res);
        }

        logger.warn('Rate limit exceeded', {
          key,
          path: req.path,
          method: req.method,
        });

        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
          limit: result.info.limit,
          resetTime: new Date(result.info.resetTime).toISOString(),
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fail open - allow request if rate limiter fails
      next();
    }
  };
}
