// Mock for middleware/rateLimit
import { Request, Response, NextFunction } from 'express';
import { getRateLimitConfig } from '../../src/config/rateLimit.js';

type InMemoryEntry = {
  count: number;
  resetAt: number;
};

const inMemoryStore = new Map<string, InMemoryEntry>();

export const rateLimit = () => (_req: Request, _res: Response, next: NextFunction) => next();

export const rateLimitMiddleware = (_req: Request, _res: Response, next: NextFunction) => next();

export const createRateLimiter = () => rateLimitMiddleware;

export const resetRateLimitStore = () => {
  inMemoryStore.clear();
};

export const createRouteRateLimitMiddleware = (group: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const config = getRateLimitConfig();
    if (!config.enabled) {
      return next();
    }

    const groupConfig = config.groups[group as keyof typeof config.groups] || config.groups.default;
    const key = `${req.ip || req.socket?.remoteAddress || 'unknown'}:${group}`;
    const now = Date.now();
    const existing = inMemoryStore.get(key);

    let entry = existing;
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + groupConfig.windowMs };
      inMemoryStore.set(key, entry);
    }

    entry.count += 1;
    const remaining = groupConfig.limit - entry.count;
    const allowed = entry.count <= groupConfig.limit;

    res.setHeader('X-RateLimit-Limit', String(groupConfig.limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(remaining, 0)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (!allowed) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      });
    }

    return next();
  };
};

export enum EndpointClass {
  AUTH = 'AUTH',
  EXPORT = 'EXPORT',
  INGEST = 'INGEST',
  QUERY = 'QUERY',
  AI = 'AI',
  DEFAULT = 'DEFAULT',
}

export const quotaManager = {
  checkQuota: async () => ({ allowed: true }),
  recordUsage: async () => {},
};

export default {
  rateLimit,
  rateLimitMiddleware,
  createRateLimiter,
  createRouteRateLimitMiddleware,
  resetRateLimitStore,
  EndpointClass,
  quotaManager,
};
