
import { Request, Response, NextFunction } from 'express';
import { cfg } from '../config.js';

import {
  // @ts-ignore
  queryBudgetRemaining,
  // @ts-ignore
  queryBudgetBlockedTotal,
  // @ts-ignore
  queryBudgetLatencySeconds,
} from '../monitoring/metrics.js';
import { logger } from '../config/logger.js';

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class QueryBudgetGuard {
  private buckets: Map<string, Bucket> = new Map();
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private enabled: boolean;
  private mode: 'warn' | 'block';

  constructor() {
    this.maxTokens = cfg.QUERY_BUDGET_TOKENS;
    this.refillRate = cfg.QUERY_BUDGET_REFILL_RATE;
    this.enabled = cfg.QUERY_BUDGET_ENABLED;
    this.mode = cfg.QUERY_BUDGET_MODE;
  }

  // For testing
  public reset() {
    this.buckets.clear();
  }

  private getBucket(tenantId: string): Bucket {
    if (!this.buckets.has(tenantId)) {
      this.buckets.set(tenantId, {
        tokens: this.maxTokens,
        lastRefill: Date.now(),
      });
    }
    return this.buckets.get(tenantId)!;
  }

  private refill(bucket: Bucket) {
    const now = Date.now();
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;

    if (elapsedSeconds > 0) {
      const addedTokens = elapsedSeconds * this.refillRate;
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + addedTokens);
      bucket.lastRefill = now;
    }
  }

  public checkBudget(tenantId: string, cost: number = 1): boolean {
    if (!this.enabled) {return true;}

    const bucket = this.getBucket(tenantId);
    this.refill(bucket);

    if (bucket.tokens >= cost) {
      return true;
    }

    return false;
  }

  public consumeBudget(tenantId: string, cost: number = 1): void {
    if (!this.enabled) {return;}

    const bucket = this.getBucket(tenantId);
    // Refill logic is handled in checkBudget, but we should ensure we are up to date
    // if consume is called without check (though typical usage is check then consume)
    this.refill(bucket);

    bucket.tokens = Math.max(0, bucket.tokens - cost);

    // Update metric
    queryBudgetRemaining.set({ tenant: tenantId }, bucket.tokens);
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.enabled) {return next();}

      const start = process.hrtime();

      // Tenant ID resolution strategy matching app.ts/tenantContext
      const tenantId =
        (req as any).user?.tenant_id ||
        req.headers['x-tenant-id'] ||
        'anonymous';

      if (tenantId === 'anonymous') {
         // Optionally skip or enforce strict limits for anonymous
         // For now, let's just proceed to avoid breaking unauth flows if not intended
         return next();
      }

      const allowed = this.checkBudget(tenantId, 1);

      if (!allowed) {
        queryBudgetBlockedTotal.inc({ tenant: tenantId });

        if (this.mode === 'block') {
           const end = process.hrtime(start);
           queryBudgetLatencySeconds.observe(end[0] + end[1] / 1e9);

           logger.warn({ tenantId }, 'Query budget exceeded, blocking request');
           return res.status(429).json({
             error: 'Query budget exceeded',
             retryAfter: 1
           });
        } else {
           logger.warn({ tenantId }, 'Query budget exceeded (warn-only)');
        }
      } else {
        this.consumeBudget(tenantId, 1);
      }

      const end = process.hrtime(start);
      queryBudgetLatencySeconds.observe(end[0] + end[1] / 1e9);

      next();
    };
  }
}

export const queryBudgetGuard = new QueryBudgetGuard();
export const queryBudgetMiddleware = queryBudgetGuard.middleware();
