/**
 * Quota Management Service
 *
 * Enforces usage quotas for tenants across different dimensions
 * (API calls, graph queries, storage, etc.).
 */

import { Pool } from 'pg';
import { getPostgresPool } from '../config/database.js';
import { QuotaCheckInput, QuotaCheckResult, UsageKind } from '../types/usage.js';
import PricingEngine from './PricingEngine.js';
import logger from '../utils/logger.js';

export interface QuotaDimension {
  dimension: string;
  limit: number;
  used: number;
  period: 'hourly' | 'daily' | 'monthly';
  lastRenewal: Date;
}

export interface QuotaAssertionRequest {
  tenantId: string;
  dimension: string;
  quantity: number;
}

export type PricingTier = 'community' | 'pro' | 'power' | 'white-label-starter' | 'white-label-team';

export const TIER_LIMITS: Record<PricingTier, Record<string, { limit: number; period: QuotaDimension['period'] }>> = {
  'community': {
    'switchboard.runs': { limit: 10, period: 'daily' },
    'switchboard.actions': { limit: 100, period: 'daily' },
  },
  'pro': {
    'switchboard.runs': { limit: 100, period: 'daily' },
    'switchboard.actions': { limit: 1000, period: 'daily' },
  },
  'power': {
    'switchboard.runs': { limit: 300, period: 'daily' },
    'switchboard.actions': { limit: 5000, period: 'daily' },
  },
  'white-label-starter': {
    'switchboard.runs': { limit: 500, period: 'daily' },
    'switchboard.actions': { limit: 10000, period: 'daily' },
  },
  'white-label-team': {
    'switchboard.runs': { limit: 2000, period: 'daily' },
    'switchboard.actions': { limit: 50000, period: 'daily' },
  },
};

export class QuotaExceededException extends Error {
  constructor(
    public tenantId: string,
    public dimension: string,
    public requested: number,
    public limit: number,
    public used: number
  ) {
    super(
      `Quota exceeded for tenant ${tenantId}, dimension ${dimension}. ` +
        `Requested: ${requested}, Used: ${used}, Limit: ${limit}`
    );
    this.name = 'QuotaExceededException';
  }
}

export class QuotaService {
  private static instance: QuotaService | null = null;
  private _pool?: Pool;

  private constructor() {}

  public static getInstance(): QuotaService {
    if (!QuotaService.instance) {
      QuotaService.instance = new QuotaService();
    }
    return QuotaService.instance;
  }

  private get pool(): Pool {
    if (!this._pool) {
      this._pool = getPostgresPool();
    }
    return this._pool;
  }

  /**
   * Check if tenant has quota available (Legacy/Test compatibility)
   */
  async checkQuota(input: QuotaCheckInput | (QuotaAssertionRequest & { kind?: UsageKind })): Promise<QuotaCheckResult> {
    const tenantId = input.tenantId;
    const kind = (input as any).kind || (input as any).dimension;
    const quantity = input.quantity;

    try {
      const { plan } = await PricingEngine.getEffectivePlan(tenantId);

      // Use TIER_LIMITS if it's a Switchboard dimension and the plan doesn't have it explicitly
      // This ensures our new tiers are applied.
      let limitConfig = plan.limits[kind];

      if (!limitConfig && kind.startsWith('switchboard.')) {
        const tier = (plan.name.toLowerCase() as PricingTier) || 'community';
        const tierLimits = TIER_LIMITS[tier] || TIER_LIMITS['community'];
        const switchboardLimit = tierLimits[kind];
        if (switchboardLimit) {
          limitConfig = {
            hardCap: switchboardLimit.limit,
          };
        }
      }

      if (!limitConfig || limitConfig.hardCap === undefined) {
        return { allowed: true };
      }

      const currentUsage = await this.getCurrentUsage(tenantId, kind as UsageKind);
      const totalRequested = currentUsage + quantity;

      const result: QuotaCheckResult = {
        allowed: totalRequested <= limitConfig.hardCap,
        remaining: Math.max(0, limitConfig.hardCap - totalRequested),
        hardCap: limitConfig.hardCap,
      };

      if (limitConfig.softThresholds) {
        for (const threshold of limitConfig.softThresholds) {
          if (totalRequested > threshold) {
            result.softThresholdTriggered = threshold;
          }
        }
      }

      return result;
    } catch (error) {
      logger.error(`Error checking quota for tenant ${tenantId}:`, error);
      // Default to allowing if engine fails, or implement fallback
      return { allowed: true };
    }
  }

  /**
   * Assert that tenant has quota available for operation.
   * Throws QuotaExceededException if quota exceeded.
   */
  async assert(request: QuotaAssertionRequest): Promise<void> {
    const result = await this.checkQuota(request);
    if (!result.allowed) {
      throw new QuotaExceededException(
        request.tenantId,
        request.dimension,
        request.quantity,
        result.hardCap || 0,
        (result.hardCap || 0) - (result.remaining || 0)
      );
    }
  }

  private async getCurrentUsage(tenantId: string, kind: UsageKind): Promise<number> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        `SELECT SUM(quantity) as total FROM usage_events
         WHERE tenant_id = $1 AND kind = $2
         AND occurred_at > date_trunc('month', now())`,
        [tenantId, kind]
      );
      return parseFloat(res.rows[0].total || '0');
    } finally {
      client.release();
    }
  }
}

export const quotaService = QuotaService.getInstance();
