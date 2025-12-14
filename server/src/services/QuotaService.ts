import { Pool } from 'pg';
import { getPostgresPool } from '../config/database.js';
import { QuotaCheckInput, QuotaCheckResult } from '../types/usage.js';
import PricingEngine from './PricingEngine.js';
import logger from '../utils/logger.js';
import { PrometheusMetrics } from '../utils/metrics.js';

export class QuotaService {
  private static instance: QuotaService;
  private pool: Pool;
  private metrics: PrometheusMetrics;

  private constructor() {
    this.pool = getPostgresPool();
    this.metrics = new PrometheusMetrics('summit_quota');

    this.metrics.createCounter(
        'checks_total',
        'Total quota checks performed',
        ['kind', 'result'] // result: allowed, denied
    );
  }

  public static getInstance(): QuotaService {
    if (!QuotaService.instance) {
      QuotaService.instance = new QuotaService();
    }
    return QuotaService.instance;
  }

  /**
   * Checks if the requested usage allows proceeding.
   */
  async checkQuota(input: QuotaCheckInput): Promise<QuotaCheckResult> {
    const { tenantId, kind, quantity } = input;

    try {
      const { plan } = await PricingEngine.getEffectivePlan(tenantId);
      const limitConfig = plan.limits[kind];

      if (!limitConfig) {
        this.metrics.incrementCounter('checks_total', { kind, result: 'allowed' });
        return { allowed: true };
      }

      if (limitConfig.hardCap === undefined) {
         this.metrics.incrementCounter('checks_total', { kind, result: 'allowed' });
         return { allowed: true };
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);

      const client = await this.pool.connect();
      let currentUsage = 0;
      try {
        const res = await client.query(
          `SELECT SUM(quantity) as total
           FROM usage_events
           WHERE tenant_id = $1
           AND kind = $2
           AND occurred_at >= $3`,
          [tenantId, kind, startOfMonth.toISOString()]
        );
        currentUsage = parseFloat(res.rows[0].total || '0');
      } finally {
        client.release();
      }

      const projectedUsage = currentUsage + quantity;

      if (projectedUsage > limitConfig.hardCap) {
        logger.warn(`usage.quota.exceeded: Tenant ${tenantId} exceeded ${kind}. Limit: ${limitConfig.hardCap}`);
        this.metrics.incrementCounter('checks_total', { kind, result: 'denied' });

        return {
          allowed: false,
          reason: `Quota exceeded for ${kind}. Limit: ${limitConfig.hardCap}, Current: ${currentUsage}, Requested: ${quantity}`,
          remaining: 0,
          hardCap: limitConfig.hardCap
        };
      }

      // Check soft thresholds
      let softThresholdTriggered: number | undefined;
      if (limitConfig.softThresholds) {
          for (const threshold of limitConfig.softThresholds) {
             if (projectedUsage >= threshold && currentUsage < threshold) {
                 softThresholdTriggered = threshold;
                 logger.info(`usage.quota.near_limit: Tenant ${tenantId} near limit for ${kind}. Threshold: ${threshold}`);
             }
          }
      }

      this.metrics.incrementCounter('checks_total', { kind, result: 'allowed' });
      return {
        allowed: true,
        remaining: limitConfig.hardCap - projectedUsage,
        hardCap: limitConfig.hardCap,
        softThresholdTriggered
      };

    } catch (error) {
      logger.error('Error checking quota', { error, input });
      // Fail open
      this.metrics.incrementCounter('checks_total', { kind, result: 'error_allowed' });
      return { allowed: true };
    }
  }
}

export default QuotaService.getInstance();
