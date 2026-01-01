import { getPostgresPool } from '../db/postgres.js';
import { planService, Plan } from './plans';
import { UsageDimension } from './events';

export interface QuotaCheck {
  tenantId: string;
  dimension: UsageDimension;
  quantity: number; // The amount of usage about to be consumed
}

export interface QuotaDecision {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  limit?: number;
  hardLimit?: boolean;
}

export interface QuotaService {
  check(check: QuotaCheck): Promise<QuotaDecision>;
  assert(check: QuotaCheck): Promise<void>; // Throws an error on denial
}

export class PostgresQuotaService implements QuotaService {
  private readonly pool = getPostgresPool();

  async check(check: QuotaCheck): Promise<QuotaDecision> {
    const plan = await planService.getPlanForTenant(check.tenantId);
    const quotaTarget = this.resolveLimit(plan, check.dimension);

    if (!quotaTarget) {
      return {
        allowed: true,
        remaining: Infinity,
        limit: Infinity,
      };
    }

    const { limit, windowStart, hardLimit } = quotaTarget;
    if (!Number.isFinite(limit)) {
      return { allowed: true, remaining: Infinity, limit };
    }

    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT COALESCE(SUM(quantity), 0) as total
           FROM usage_events
          WHERE tenant_id = $1
            AND dimension = $2
            AND occurred_at >= $3`,
        [check.tenantId, check.dimension, windowStart.toISOString()],
      );

      const used = Number(rows[0]?.total ?? 0);
      const projected = used + check.quantity;
      const remaining = Math.max(0, limit - projected);
      const allowed = projected <= limit;

      return {
        allowed,
        remaining,
        limit,
        hardLimit,
        reason: allowed
          ? undefined
          : `Quota exceeded for ${check.dimension}: limit=${limit}, used=${used}, requested=${check.quantity}`,
      };
    } finally {
      client.release();
    }
  }

  async assert(check: QuotaCheck): Promise<void> {
    const decision = await this.check(check);
    if (!decision.allowed) {
      throw new Error(decision.reason || 'QUOTA_EXCEEDED');
    }
  }

  private resolveLimit(
    plan: Plan,
    dimension: UsageDimension,
  ): { limit: number; windowStart: Date; hardLimit: boolean } | null {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    switch (dimension) {
      case 'api.requests':
        return {
          limit: plan.limits.monthlyRequests,
          windowStart: startOfMonth,
          hardLimit: true,
        };
      case 'maestro.runtime':
        return {
          limit: plan.limits.monthlyComputeMs,
          windowStart: startOfMonth,
          hardLimit: true,
        };
      case 'llm.tokens':
        return {
          limit: plan.limits.monthlyLlmTokens,
          windowStart: startOfMonth,
          hardLimit: true,
        };
      case 'data.storage.bytes':
        return {
          limit: plan.limits.maxStorageBytes,
          windowStart: new Date(0),
          hardLimit: true,
        };
      default:
        return null;
    }
  }
}
