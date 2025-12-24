// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../services/RateLimiter.js';
import { cfg } from '../config.js';
import QuotaManager from '../lib/resources/quota-manager.js';
import { tenantIsolationGuard } from '../tenancy/TenantIsolationGuard.js';
import { TenantContext } from '../tenancy/types.js';
import { tenantLimitEnforcer } from '../lib/resources/tenant-limit-enforcer.js';
import { provenanceLedger } from '../provenance/ledger.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export enum EndpointClass {
  AUTH = 'AUTH',
  EXPORT = 'EXPORT',
  INGEST = 'INGEST',
  QUERY = 'QUERY',
  DEFAULT = 'DEFAULT',
}

const CLASS_LIMITS = {
  [EndpointClass.AUTH]: { limit: 10, windowMs: 60 * 1000 }, // Strict: 10/min
  [EndpointClass.EXPORT]: { limit: 5, windowMs: 60 * 1000 }, // Expensive: 5/min
  [EndpointClass.INGEST]: { limit: 100, windowMs: 60 * 1000 }, // High throughput
  [EndpointClass.QUERY]: { limit: 300, windowMs: 60 * 1000 }, // Standard API
  [EndpointClass.DEFAULT]: { limit: 60, windowMs: 60 * 1000 },
};

export const createRateLimiter = (endpointClass: EndpointClass = EndpointClass.DEFAULT) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip health checks
    if (req.path === '/health' || req.path === '/ping') {
      return next();
    }

    const tenantContext = (req as any).tenant as TenantContext | undefined;
    const user = (req as any).user;

    // 1. Identify Key & Scope
    let key: string;
    const policy = CLASS_LIMITS[endpointClass];
    let limit = policy.limit;
    const windowMs = policy.windowMs;

    if (tenantContext?.tenantId) {
      // Tenant-scoped rate limiting per endpoint class
      key = `tenant:${tenantContext.tenantId}:class:${endpointClass}`;

      // Override limit based on Tenant Tier if available
      try {
        const quota = QuotaManager.getQuotaForTenant(tenantContext.tenantId);
        if (quota) {
            // Apply a multiplier or override based on class
            if (endpointClass === EndpointClass.INGEST) limit = quota.requestsPerMinute * 2;
            else if (endpointClass === EndpointClass.EXPORT) limit = Math.max(5, Math.floor(quota.requestsPerMinute / 20));
            else limit = quota.requestsPerMinute;
        }
      } catch (e) {
          // Fallback to defaults
      }

      // Add user suffix if needed (to prevent one user starving tenant)
      // key += `:user:${user?.id || 'anon'}`;
      // For now, let's keep it simple: Tenant-level bucket for these resources.
      // BUT, Auth is usually User/IP based, not Tenant based (often no tenant yet).
    } else if (user) {
        key = `user:${user.id}:class:${endpointClass}`;
    } else {
        key = `ip:${req.ip}:class:${endpointClass}`;
        // Lower limits for anon
        limit = Math.floor(limit / 2);
    }

    // Auth special case: Always IP based for login protection if no user
    if (endpointClass === EndpointClass.AUTH && !user) {
         key = `ip:${req.ip}:auth`;
         limit = 5; // Very strict for login attempts
    }

    // 2. Check Limit
    try {
        const result = await rateLimiter.checkLimit(key, limit, windowMs);

        // 3. Headers
        res.set('X-RateLimit-Limit', String(result.total));
        res.set('X-RateLimit-Remaining', String(result.remaining));
        res.set('X-RateLimit-Reset', String(Math.ceil(result.reset / 1000)));
        if (tenantContext) {
             res.set('X-RateLimit-Tenant', tenantContext.tenantId);
        }

        if (!result.allowed) {
            // Audit
            if (tenantContext) {
                provenanceLedger.appendEntry({
                    tenantId: tenantContext.tenantId,
                    actionType: 'RATE_LIMIT_EXCEEDED',
                    resourceType: 'endpoint_class',
                    resourceId: endpointClass,
                    actorId: user?.id || 'system',
                    actorType: 'user',
                    payload: { key, limit, remaining: result.remaining },
                    metadata: { ip: req.ip }
                }).catch(() => {});
            }

            return res.status(429).json({
                error: 'Too many requests',
                class: endpointClass,
                retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
            });
        }

        next();

    } catch (e) {
        console.error('Rate limit error', e);
        // Fail open if Redis is down? Or closed?
        // Usually fail open for reliability unless strict.
        next();
    }
  };
};

// Default export backward compatible (approximate)
export const rateLimitMiddleware = createRateLimiter(EndpointClass.DEFAULT);
