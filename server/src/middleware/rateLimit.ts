import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../services/RateLimiter.js';
import { cfg } from '../config.js';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

const TIER_LIMITS = {
  FREE: 100,      // 100/hr
  PRO: 1000,      // 1000/hr
  ENTERPRISE: 10000 // 10000/hr
};

/**
 * Rate limiting middleware.
 * Prioritizes authenticated user limits over IP limits.
 */
export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip if it's a health check (usually handled before, but safe to check)
  if (req.path === '/health' || req.path === '/ping' || req.path === '/health/detailed' || req.path === '/health/ready' || req.path === '/health/live') {
    return next();
  }

  let key: string;
  let limit: number;
  let windowMs = 3600 * 1000; // 1 hour window as per tiers (100/hr)

  // Determine key and limit
  // @ts-ignore - req.user is populated by auth middleware
  const user = req.user;

  if (user) {
    key = `user:${user.id || user.sub}`;

    // Determine limit based on tier
    // Assuming user object has a 'tier' property or defaulting to FREE
    const userTier = (user.tier || 'FREE').toUpperCase();
    limit = TIER_LIMITS[userTier as keyof typeof TIER_LIMITS] || TIER_LIMITS.FREE;

  } else {
    key = `ip:${req.ip}`;
    // Unauthenticated users get the Free tier limit or stricter
    limit = TIER_LIMITS.FREE;
  }

  // Custom limits for expensive operations
  // Note: When mounted on a path, req.path is relative. Use originalUrl or check baseUrl.
  if (req.originalUrl.includes('/graphql') || req.baseUrl.endsWith('/graphql')) {
      key += ':graphql';
      // Search/Graph ops: 20/min = 1200/hr.
      // If we keep 1hr window, we can just use the tier limit.
      // Or we can switch to a shorter window for these specific endpoints.
      // Let's stick to the prompt's "Search: 20/min"
      windowMs = 60 * 1000;
      limit = 20;
  } else if (req.path.startsWith('/api/ai')) {
      key += ':ai';
      // AI: 5/min
      windowMs = 60 * 1000;
      limit = 5;
  }

  const result = await rateLimiter.checkLimit(key, limit, windowMs);

  // Set standard headers
  res.set('X-RateLimit-Limit', String(result.total));
  res.set('X-RateLimit-Remaining', String(result.remaining));
  res.set('X-RateLimit-Reset', String(Math.ceil(result.reset / 1000)));

  if (!result.allowed) {
    res.set('Retry-After', String(Math.ceil((result.reset - Date.now()) / 1000)));
    res.status(429).json({
      error: 'Too many requests, please try again later',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
    });
    return;
  }

  next();
};
