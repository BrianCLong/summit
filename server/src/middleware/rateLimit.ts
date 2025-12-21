import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../services/RateLimiter.js';
import { cfg } from '../config.js';
import QuotaManager from '../lib/resources/quota-manager.js';
import { tenantIsolationGuard } from '../tenancy/TenantIsolationGuard.js';
import { TenantContext } from '../tenancy/types.js';
import { tenantLimitEnforcer } from '../lib/resources/tenant-limit-enforcer.js';
import { provenanceLedger } from '../provenance/ledger.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

  // 1. Tenant Quota Check (hard isolation)
  const tenantContext = (req as any).tenant as TenantContext | undefined;
  if (tenantContext) {
    const resource: 'api' | 'ingestion' | 'rag' = req.path.startsWith('/ingest')
      ? 'ingestion'
      : req.originalUrl.includes('/graphql') || req.baseUrl.endsWith('/graphql')
        ? 'rag'
        : 'api';

    const rateResult = await tenantIsolationGuard.enforceRateLimit(tenantContext, resource);

    res.set('X-Tenant-Quota-Limit', 'true');
    res.set('X-Tenant-Quota-Remaining', String(rateResult.remaining));
    res.set('X-Tenant-Quota-Reset', String(Math.ceil(rateResult.reset / 1000)));

    if (!rateResult.allowed) {
      try {
        await provenanceLedger.appendEntry({
          tenantId: tenantContext.tenantId,
          actionType: 'TENANT_RATE_LIMIT_EXCEEDED',
          resourceType: 'rate_limit',
          resourceId: `${tenantContext.tenantId}:${resource}`,
          actorId: (req as any).user?.id || 'system',
          actorType: 'user',
          payload: {
            bucket: rateResult.bucket,
            remaining: rateResult.remaining,
            reset: rateResult.reset,
            path: req.originalUrl,
          },
          metadata: {
            method: req.method,
            ipAddress: req.ip,
            correlationId: (req as any).correlationId,
          },
        });
      } catch (err) {
        // best-effort audit; continue with response
        (req as any).logger?.warn?.({ err }, 'Failed to audit tenant rate limit exceedance');
      }
      res.status(429).json({
        error: 'Tenant quota exceeded',
        retryAfter: Math.ceil((rateResult.reset - Date.now()) / 1000),
      });
      return;
    }

    // 1b. Seat cap enforcement
    const seatCheck = await tenantLimitEnforcer.enforceSeatCap(
      tenantContext,
      (req as any).user?.id,
    );
    res.set('X-Tenant-Seat-Limit', String(seatCheck.limit));
    res.set('X-Tenant-Seat-Remaining', String(seatCheck.remaining));
    if (!seatCheck.allowed) {
      const retryMs = ONE_DAY_MS - (Date.now() % ONE_DAY_MS);
      res.status(429).json({
        error: 'Tenant seat cap reached',
        retryAfter: Math.ceil(retryMs / 1000),
      });
      return;
    }
  }

  // 2. User/IP Rate Limiting (DoS Protection)
  // @ts-ignore - req.user is populated by auth middleware
  const user = req.user;
  let key: string;
  let limit: number;
  let windowMs = cfg.RATE_LIMIT_WINDOW_MS;

  if (user) {
    key = `user:${user.id || user.sub}`;
    // Dynamic tier-based limit
    // @ts-ignore - tenantId usually available on user or context
    const tenantId = user.tenantId || req.headers['x-tenant-id'];
    if (tenantId) {
        const quota = QuotaManager.getQuotaForTenant(tenantId);
        limit = quota.requestsPerMinute; // Assuming window is 1 minute, else adjust
    } else {
        limit = cfg.RATE_LIMIT_MAX_AUTHENTICATED;
    }
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
    const tenantId = (req as any).tenant?.tenantId || (req as any).user?.tenantId;
    if (tenantId) {
      provenanceLedger
        .appendEntry({
          tenantId,
          actionType: 'TENANT_RATE_LIMIT_EXCEEDED',
          resourceType: 'rate_limit',
          resourceId: key,
          actorId: (req as any).user?.id || 'system',
          actorType: 'user',
          payload: {
            remaining: result.remaining,
            reset: result.reset,
            key,
            path: req.originalUrl,
          },
          metadata: { ipAddress: req.ip },
        })
        .catch(() => {});
    }
    res.status(429).json({
      error: 'Too many requests, please try again later',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
    });
    return;
  }

  next();
};
