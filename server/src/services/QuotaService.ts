/**
 * Quota Management Service
 *
 * Enforces usage quotas for tenants across different dimensions
 * (API calls, graph queries, storage, etc.).
 *
 * Implementation Status (P1-2 from audit report):
 * - ✅ In-memory quota tracking
 * - ✅ Per-tenant, per-dimension limits
 * - ✅ Quota assertion with exceptions
 * - ⚠️ MISSING: Redis persistence for multi-instance deployments
 * - ⚠️ MISSING: PostgreSQL history tracking
 * - ⚠️ MISSING: Quota renewal/reset scheduling
 *
 * @module services/QuotaService
 */

export interface QuotaDimension {
  /** Dimension identifier (e.g., 'graph.queries', 'api.calls') */
  dimension: string;

  /** Maximum allowed quantity per period */
  limit: number;

  /** Current usage */
  used: number;

  /** Renewal period ('hourly', 'daily', 'monthly') */
  period: 'hourly' | 'daily' | 'monthly';

  /** Last renewal timestamp */
  lastRenewal: Date;
}

export interface QuotaAssertionRequest {
  tenantId: string;
  dimension: string;
  quantity: number;
}

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
  // In-memory quota store: tenantId -> dimension -> QuotaDimension
  private quotas: Map<string, Map<string, QuotaDimension>> = new Map();

  // Default quotas for new tenants
  private defaultLimits: Record<string, { limit: number; period: QuotaDimension['period'] }> = {
    'graph.queries': { limit: 1000, period: 'daily' },
    'api.calls': { limit: 10000, period: 'daily' },
    'graph.writes': { limit: 500, period: 'daily' },
    'storage.bytes': { limit: 10_000_000_000, period: 'monthly' }, // 10GB
    'ai.tokens': { limit: 1_000_000, period: 'monthly' },
  };

  constructor() {
    console.info('[QuotaService] Initialized with in-memory quota tracking.');
  }

  /**
   * Assert that tenant has quota available for operation.
   * Throws QuotaExceededException if quota exceeded.
   *
   * @param request Quota assertion request
   * @throws QuotaExceededException if quota exceeded
   */
  async assert(request: QuotaAssertionRequest): Promise<void> {
    const { tenantId, dimension, quantity } = request;

    // Get or initialize tenant quotas
    if (!this.quotas.has(tenantId)) {
      this.quotas.set(tenantId, new Map());
    }

    const tenantQuotas = this.quotas.get(tenantId)!;

    // Get or initialize dimension quota
    if (!tenantQuotas.has(dimension)) {
      const defaults = this.defaultLimits[dimension] || { limit: 1000, period: 'daily' as const };
      tenantQuotas.set(dimension, {
        dimension,
        limit: defaults.limit,
        used: 0,
        period: defaults.period,
        lastRenewal: new Date(),
      });
    }

    const quota = tenantQuotas.get(dimension)!;

    // Check if quota needs renewal
    this.checkAndRenewQuota(quota);

    // Check if operation would exceed quota
    if (quota.used + quantity > quota.limit) {
      throw new QuotaExceededException(tenantId, dimension, quantity, quota.limit, quota.used);
    }

    // Increment usage
    quota.used += quantity;

    console.debug(
      `[QuotaService] Tenant ${tenantId}, dimension ${dimension}: used ${quota.used}/${quota.limit}`
    );
  }

  /**
   * Get current quota status for a tenant dimension
   */
  async getQuota(tenantId: string, dimension: string): Promise<QuotaDimension | null> {
    const tenantQuotas = this.quotas.get(tenantId);
    if (!tenantQuotas) return null;

    const quota = tenantQuotas.get(dimension);
    if (!quota) return null;

    // Check and renew if needed
    this.checkAndRenewQuota(quota);

    return quota;
  }

  /**
   * Get all quotas for a tenant
   */
  async getAllQuotas(tenantId: string): Promise<QuotaDimension[]> {
    const tenantQuotas = this.quotas.get(tenantId);
    if (!tenantQuotas) return [];

    const quotas = Array.from(tenantQuotas.values());

    // Check and renew all
    quotas.forEach((q) => this.checkAndRenewQuota(q));

    return quotas;
  }

  /**
   * Set custom quota for a tenant dimension
   */
  async setQuota(
    tenantId: string,
    dimension: string,
    limit: number,
    period: QuotaDimension['period']
  ): Promise<void> {
    if (!this.quotas.has(tenantId)) {
      this.quotas.set(tenantId, new Map());
    }

    const tenantQuotas = this.quotas.get(tenantId)!;

    tenantQuotas.set(dimension, {
      dimension,
      limit,
      used: 0,
      period,
      lastRenewal: new Date(),
    });

    console.info(`[QuotaService] Set quota for tenant ${tenantId}, dimension ${dimension}: ${limit} per ${period}`);
  }

  /**
   * Reset quota usage (admin operation)
   */
  async resetQuota(tenantId: string, dimension: string): Promise<void> {
    const tenantQuotas = this.quotas.get(tenantId);
    if (!tenantQuotas) return;

    const quota = tenantQuotas.get(dimension);
    if (!quota) return;

    quota.used = 0;
    quota.lastRenewal = new Date();

    console.info(`[QuotaService] Reset quota for tenant ${tenantId}, dimension ${dimension}`);
  }

  /**
   * Check if quota needs renewal based on period
   */
  private checkAndRenewQuota(quota: QuotaDimension): void {
    const now = new Date();
    const lastRenewal = new Date(quota.lastRenewal);
    let shouldRenew = false;

    switch (quota.period) {
      case 'hourly':
        shouldRenew = now.getTime() - lastRenewal.getTime() > 60 * 60 * 1000;
        break;
      case 'daily':
        shouldRenew = now.getTime() - lastRenewal.getTime() > 24 * 60 * 60 * 1000;
        break;
      case 'monthly':
        shouldRenew =
          now.getMonth() !== lastRenewal.getMonth() || now.getFullYear() !== lastRenewal.getFullYear();
        break;
    }

    if (shouldRenew) {
      quota.used = 0;
      quota.lastRenewal = now;
      console.info(`[QuotaService] Renewed quota: ${quota.dimension} (period: ${quota.period})`);
    }
  }
}

// Singleton instance
export const quotaService = new QuotaService();
