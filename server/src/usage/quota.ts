import { getPostgresPool } from '../db/postgres.js';
import { planService, Plan } from './plans';
import { UsageDimension } from './events';

export interface QuotaLimit {
  limit: number;
  hardLimit?: boolean;
}

export type TenantQuotaConfig = Partial<Record<UsageDimension, QuotaLimit>>;
export type TenantUsageTotals = Partial<Record<UsageDimension, number>>;

export interface QuotaDataSource {
  loadTenantQuota(tenantId: string): Promise<TenantQuotaConfig>;
  loadTenantUsage(tenantId: string): Promise<TenantUsageTotals>;
}

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
  constructor(private readonly dataSource: QuotaDataSource = new InMemoryQuotaDataSource()) {}

  async check(check: QuotaCheck): Promise<QuotaDecision> {
    if (check.quantity < 0) {
      throw new Error('Quantity must be non-negative');
    }

    const [quotaConfig, usageTotals] = await Promise.all([
      this.dataSource.loadTenantQuota(check.tenantId),
      this.dataSource.loadTenantUsage(check.tenantId),
    ]);

    const limit = quotaConfig[check.dimension];
    // No limit configured for this dimension; allow by default.
    if (!limit || limit.limit === undefined || limit.limit === null) {
      return {
        allowed: true,
        remaining: undefined,
        limit: undefined,
        hardLimit: limit?.hardLimit,
      };
    }

    const consumed = usageTotals[check.dimension] ?? 0;
    const remainingBeforeRequest = limit.limit - consumed;
    const projectedRemaining = remainingBeforeRequest - check.quantity;
    const allowed = projectedRemaining >= 0;

    const decision: QuotaDecision = {
      allowed,
      remaining: Math.max(projectedRemaining, 0),
      limit: limit.limit,
      hardLimit: Boolean(limit.hardLimit),
    };

    if (!allowed) {
      const quotaType = limit.hardLimit ? 'Hard' : 'Soft';
      decision.reason = `${quotaType} quota exceeded for ${check.dimension}: limit=${limit.limit}, used=${consumed}, requested=${check.quantity}`;
    }

    return decision;
  }

  async assert(check: QuotaCheck): Promise<void> {
    const decision = await this.check(check);
    if (!decision.allowed) {
      const prefix = decision.hardLimit ? 'HARD_QUOTA_EXCEEDED' : 'SOFT_QUOTA_EXCEEDED';
      const details = decision.reason ? `${prefix}: ${decision.reason}` : prefix;
      throw new Error(details);
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

export class InMemoryQuotaDataSource implements QuotaDataSource {
  private quotas: Map<string, TenantQuotaConfig> = new Map();
  private usage: Map<string, TenantUsageTotals> = new Map();

  constructor(
    initialQuotas: Record<string, TenantQuotaConfig> = {},
    initialUsage: Record<string, TenantUsageTotals> = {},
  ) {
    Object.entries(initialQuotas).forEach(([tenantId, config]) => {
      this.setTenantQuota(tenantId, config);
    });
    Object.entries(initialUsage).forEach(([tenantId, totals]) => {
      this.setTenantUsage(tenantId, totals);
    });
  }

  async loadTenantQuota(tenantId: string): Promise<TenantQuotaConfig> {
    return { ...(this.quotas.get(tenantId) || {}) };
  }

  async loadTenantUsage(tenantId: string): Promise<TenantUsageTotals> {
    return { ...(this.usage.get(tenantId) || {}) };
  }

  setTenantQuota(tenantId: string, config: TenantQuotaConfig): void {
    this.quotas.set(tenantId, { ...config });
  }

  setTenantUsage(tenantId: string, totals: TenantUsageTotals): void {
    this.usage.set(tenantId, { ...totals });
  }
}
