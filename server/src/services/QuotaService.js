"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaService = exports.QuotaService = exports.QuotaExceededException = void 0;
class QuotaExceededException extends Error {
    tenantId;
    dimension;
    requested;
    limit;
    used;
    constructor(tenantId, dimension, requested, limit, used) {
        super(`Quota exceeded for tenant ${tenantId}, dimension ${dimension}. ` +
            `Requested: ${requested}, Used: ${used}, Limit: ${limit}`);
        this.tenantId = tenantId;
        this.dimension = dimension;
        this.requested = requested;
        this.limit = limit;
        this.used = used;
        this.name = 'QuotaExceededException';
    }
}
exports.QuotaExceededException = QuotaExceededException;
class QuotaService {
    // In-memory quota store: tenantId -> dimension -> QuotaDimension
    quotas = new Map();
    // Default quotas for new tenants
    defaultLimits = {
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
    async assert(request) {
        const { tenantId, dimension, quantity } = request;
        // Get or initialize tenant quotas
        if (!this.quotas.has(tenantId)) {
            this.quotas.set(tenantId, new Map());
        }
        const tenantQuotas = this.quotas.get(tenantId);
        // Get or initialize dimension quota
        if (!tenantQuotas.has(dimension)) {
            const defaults = this.defaultLimits[dimension] || { limit: 1000, period: 'daily' };
            tenantQuotas.set(dimension, {
                dimension,
                limit: defaults.limit,
                used: 0,
                period: defaults.period,
                lastRenewal: new Date(),
            });
        }
        const quota = tenantQuotas.get(dimension);
        // Check if quota needs renewal
        this.checkAndRenewQuota(quota);
        // Check if operation would exceed quota
        if (quota.used + quantity > quota.limit) {
            throw new QuotaExceededException(tenantId, dimension, quantity, quota.limit, quota.used);
        }
        // Increment usage
        quota.used += quantity;
        console.debug(`[QuotaService] Tenant ${tenantId}, dimension ${dimension}: used ${quota.used}/${quota.limit}`);
    }
    /**
     * Get current quota status for a tenant dimension
     */
    async getQuota(tenantId, dimension) {
        const tenantQuotas = this.quotas.get(tenantId);
        if (!tenantQuotas)
            return null;
        const quota = tenantQuotas.get(dimension);
        if (!quota)
            return null;
        // Check and renew if needed
        this.checkAndRenewQuota(quota);
        return quota;
    }
    /**
     * Get all quotas for a tenant
     */
    async getAllQuotas(tenantId) {
        const tenantQuotas = this.quotas.get(tenantId);
        if (!tenantQuotas)
            return [];
        const quotas = Array.from(tenantQuotas.values());
        // Check and renew all
        quotas.forEach((q) => this.checkAndRenewQuota(q));
        return quotas;
    }
    /**
     * Set custom quota for a tenant dimension
     */
    async setQuota(tenantId, dimension, limit, period) {
        if (!this.quotas.has(tenantId)) {
            this.quotas.set(tenantId, new Map());
        }
        const tenantQuotas = this.quotas.get(tenantId);
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
    async resetQuota(tenantId, dimension) {
        const tenantQuotas = this.quotas.get(tenantId);
        if (!tenantQuotas)
            return;
        const quota = tenantQuotas.get(dimension);
        if (!quota)
            return;
        quota.used = 0;
        quota.lastRenewal = new Date();
        console.info(`[QuotaService] Reset quota for tenant ${tenantId}, dimension ${dimension}`);
    }
    /**
     * Check if quota needs renewal based on period
     */
    checkAndRenewQuota(quota) {
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
exports.QuotaService = QuotaService;
// Singleton instance
exports.quotaService = new QuotaService();
