import { rateLimiter } from '../../services/RateLimiter.js';
import { quotaConfigService, DEFAULT_PLANS } from './QuotaConfig.js';
import { PlanLimits, PlanTier, QuotaCheckResult } from './types.js';
import { PrometheusMetrics } from '../../utils/metrics.js';
import pino from 'pino';

const logger = pino({ name: 'QuotaEnforcer' });

export class QuotaEnforcer {
  private static instance: QuotaEnforcer;
  private metrics: PrometheusMetrics;

  private constructor() {
    this.metrics = new PrometheusMetrics('quota_enforcer');
    this.metrics.createCounter('quota_rejections_total', 'Total quota rejections', ['tenant_id', 'reason']);
    this.metrics.createCounter('feature_access_denied_total', 'Total feature access denials', ['tenant_id', 'feature']);
  }

  public static getInstance(): QuotaEnforcer {
    if (!QuotaEnforcer.instance) {
      QuotaEnforcer.instance = new QuotaEnforcer();
    }
    return QuotaEnforcer.instance;
  }

  private getLimits(tenantId: string): PlanLimits {
    const plan = quotaConfigService.getTenantPlan(tenantId);
    const baseLimits = DEFAULT_PLANS[plan];
    const overrides = quotaConfigService.getTenantOverrides(tenantId);

    return {
      ...baseLimits,
      ...overrides,
    };
  }

  /**
   * Check if a tenant is allowed to use a specific feature (e.g. 'write_aware_sharding')
   */
  public isFeatureAllowed(tenantId: string, feature: string): boolean {
    const allowedTenants = quotaConfigService.getFeatureAllowlist(feature);
    const allowed = allowedTenants.includes(tenantId);

    if (!allowed) {
        this.metrics.incrementCounter('feature_access_denied_total', { tenant_id: tenantId, feature });
    }

    return allowed;
  }

  /**
   * Enforce API Requests Per Minute (RPM) quota.
   */
  public async checkApiQuota(tenantId: string): Promise<QuotaCheckResult> {
    const limits = this.getLimits(tenantId);
    const result = await rateLimiter.checkLimit(`quota:${tenantId}:api_rpm`, limits.api_rpm, 60 * 1000);

    if (!result.allowed) {
        this.metrics.incrementCounter('quota_rejections_total', { tenant_id: tenantId, reason: 'api_rpm' });
    }

    return {
      allowed: result.allowed,
      limit: result.total,
      remaining: result.remaining,
      reset: result.reset,
      reason: result.allowed ? undefined : 'API_RPM_EXCEEDED',
    };
  }

  /**
   * Enforce Ingest Events Per Second (EPS) quota.
   * @param count Number of events in this batch
   */
  public async checkIngestQuota(tenantId: string, count: number = 1): Promise<QuotaCheckResult> {
    const limits = this.getLimits(tenantId);
    // EPS check: window 1 second
    const result = await rateLimiter.checkLimit(`quota:${tenantId}:ingest_eps`, limits.ingest_eps, 1000, count);

    if (!result.allowed) {
        this.metrics.incrementCounter('quota_rejections_total', { tenant_id: tenantId, reason: 'ingest_eps' });
    }

    return {
      allowed: result.allowed,
      limit: result.total,
      remaining: result.remaining,
      reset: result.reset,
      reason: result.allowed ? undefined : 'INGEST_EPS_EXCEEDED',
    };
  }

  /**
   * Enforce Egress Volume (GB/Day) quota.
   * @param bytes Number of bytes to check/consume
   */
  public async checkEgressQuota(tenantId: string, bytes: number): Promise<QuotaCheckResult> {
    const limits = this.getLimits(tenantId);
    const limitBytes = limits.egress_gb_day * 1024 * 1024 * 1024;
    const windowMs = 24 * 60 * 60 * 1000; // 1 day

    const result = await rateLimiter.checkLimit(`quota:${tenantId}:egress_day`, limitBytes, windowMs, bytes);

    if (!result.allowed) {
        this.metrics.incrementCounter('quota_rejections_total', { tenant_id: tenantId, reason: 'egress_day' });
    }

    return {
      allowed: result.allowed,
      limit: result.total,
      remaining: result.remaining,
      reset: result.reset,
      reason: result.allowed ? undefined : 'EGRESS_LIMIT_EXCEEDED',
    };
  }
}

export const quotaEnforcer = QuotaEnforcer.getInstance();
