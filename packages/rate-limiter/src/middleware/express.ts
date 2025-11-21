/**
 * Express Rate Limit Middleware
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import type { RateLimiter } from '../rate-limiter.js';
import type { RateLimiterOptions, UserTier, RateLimitState } from '../types.js';

const logger = pino();

/**
 * Default key generator - uses user ID, tenant ID, or IP address
 */
function defaultKeyGenerator(req: Request): string {
  // Prioritize authenticated user
  if ((req as any).user?.id) {
    return `user:${(req as any).user.id}`;
  }

  // Fall back to tenant
  if ((req as any).tenant?.id) {
    return `tenant:${(req as any).tenant.id}`;
  }

  // Fall back to IP
  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

/**
 * Default tier extractor
 */
function defaultTierExtractor(req: Request): UserTier | undefined {
  // Check user tier
  if ((req as any).user?.tier) {
    return (req as any).user.tier as UserTier;
  }

  // Check tenant tier
  if ((req as any).tenant?.plan || (req as any).tenant?.tier) {
    return ((req as any).tenant.plan || (req as any).tenant.tier) as UserTier;
  }

  return undefined;
}

/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(res: Response, state: RateLimitState): void {
  res.setHeader('X-RateLimit-Limit', state.limit.toString());
  res.setHeader('X-RateLimit-Remaining', state.remaining.toString());
  res.setHeader('X-RateLimit-Reset', state.resetAt.toString());

  if (state.isExceeded && state.retryAfter > 0) {
    res.setHeader('Retry-After', state.retryAfter.toString());
  }
}

/**
 * Default handler for rate limit exceeded
 */
function defaultHandler(
  req: Request,
  res: Response,
  next: NextFunction,
  state: RateLimitState,
): void {
  setRateLimitHeaders(res, state);

  res.status(429).json({
    error: 'rate_limit_exceeded',
    message: 'Too many requests. Please try again later.',
    retryAfter: state.retryAfter,
    limit: state.limit,
    remaining: 0,
    resetAt: new Date(state.resetAt * 1000).toISOString(),
  });
}

/**
 * Create Express middleware for rate limiting
 */
export function createRateLimitMiddleware(
  rateLimiter: RateLimiter,
  options: Partial<RateLimiterOptions> = {},
) {
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;
  const handler = options.handler || defaultHandler;
  const skip = options.skip;
  const includeHeaders = options.headers !== false;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if should skip rate limiting
      if (skip && await skip(req)) {
        return next();
      }

      // Extract identifier and tier
      const identifier = await keyGenerator(req);
      const tier = defaultTierExtractor(req);
      const endpoint = req.path;

      // Check rate limit
      const state = await rateLimiter.check(identifier, endpoint, tier);

      // Set headers if enabled
      if (includeHeaders) {
        setRateLimitHeaders(res, state);
      }

      // Handle rate limit exceeded
      if (state.isExceeded) {
        return handler(req, res, next, state);
      }

      // Allow request
      next();
    } catch (error) {
      logger.error({
        message: 'Rate limit middleware error',
        path: req.path,
        error: error instanceof Error ? error.message : String(error),
      });

      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Create endpoint-specific rate limiter
 */
export function createEndpointRateLimiter(
  rateLimiter: RateLimiter,
  endpoint: string,
  options: Partial<RateLimiterOptions> = {},
) {
  return createRateLimitMiddleware(rateLimiter, {
    ...options,
    keyGenerator: async (req) => {
      const baseKey = options.keyGenerator
        ? await options.keyGenerator(req)
        : defaultKeyGenerator(req);
      return `${baseKey}:${endpoint}`;
    },
  });
}

/**
 * Create tier-based rate limiter
 */
export function createTierRateLimiter(
  rateLimiter: RateLimiter,
  requiredTier: UserTier,
  options: Partial<RateLimiterOptions> = {},
) {
  return createRateLimitMiddleware(rateLimiter, {
    ...options,
    skip: async (req) => {
      const tier = defaultTierExtractor(req);
      if (!tier) {
        return false;
      }

      // If skip function provided, use it
      if (options.skip && await options.skip(req)) {
        return true;
      }

      // Check tier hierarchy
      const tierHierarchy: UserTier[] = ['free', 'basic', 'premium', 'enterprise', 'internal'];
      const currentTierIndex = tierHierarchy.indexOf(tier);
      const requiredTierIndex = tierHierarchy.indexOf(requiredTier);

      // Skip if user has higher tier than required
      return currentTierIndex >= requiredTierIndex;
    },
  });
}
