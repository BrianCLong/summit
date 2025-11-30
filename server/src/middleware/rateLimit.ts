import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../services/RateLimiter.js';
import { quotaManager } from '../lib/resources/quota-manager.js';
import { cfg } from '../config.js';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

/**
 * Rate limiting middleware.
 * Prioritizes authenticated user limits over IP limits.
 * Enforces Tenant Quotas.
 */
export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip if it's a health check (usually handled before, but safe to check)
  if (req.path === '/health' || req.path === '/ping') {
    return next();
  }

  // 1. Tenant Quota Check
  // @ts-ignore - req.user is populated by auth middleware
  const user = req.user;
  const tenantId = user?.tenantId;

  if (tenantId) {
      let resource = 'api';
      if (req.originalUrl.includes('/graphql') || req.baseUrl.endsWith('/graphql')) {
          resource = 'graphql';
      } else if (req.path.startsWith('/ingest')) {
          resource = 'ingest';
      }

      const quotaResult = await quotaManager.checkQuota(tenantId, resource);

      res.set('X-Tenant-Quota-Limit', 'true'); // Indicating quota is active
      res.set('X-Tenant-Quota-Remaining', String(quotaResult.remaining));

      if (!quotaResult.allowed) {
           res.status(429).json({
              error: 'Tenant quota exceeded',
              retryAfter: Math.ceil((quotaResult.reset - Date.now()) / 1000)
           });
           return;
      }
  }

  // 2. User/IP Rate Limiting (DoS Protection)
  let key: string;
  let limit: number;
  let windowMs = cfg.RATE_LIMIT_WINDOW_MS;

  if (user) {
    key = `user:${user.id || user.sub}`;
    // Higher limit for authenticated users
    limit = cfg.RATE_LIMIT_MAX_AUTHENTICATED;
  } else {
    key = `ip:${req.ip}`;
    limit = cfg.RATE_LIMIT_MAX_REQUESTS;
  }

  // Custom limits for expensive operations
  if (req.originalUrl.includes('/graphql') || req.baseUrl.endsWith('/graphql')) {
      key += ':graphql';
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
