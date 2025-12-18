import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip rate limiting for health checks
  if (req.path.startsWith('/health')) {
    next();
    return;
  }

  const key = req.ip || 'unknown';
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt <= now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 1,
      resetAt: now + WINDOW_MS,
    };
    rateLimitStore.set(key, entry);
  } else {
    entry.count++;
  }

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - entry.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

  if (entry.count > MAX_REQUESTS) {
    logger.warn('Rate limit exceeded', { ip: key, count: entry.count });
    res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
    return;
  }

  next();
}
