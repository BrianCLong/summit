"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryQuotaDataSource = exports.PostgresQuotaService = void 0;
class PostgresQuotaService {
    dataSource;
    constructor(dataSource = new InMemoryQuotaDataSource()) {
        this.dataSource = dataSource;
    }
    async check(check) {
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
        const decision = {
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
    async assert(check) {
        const decision = await this.check(check);
        if (!decision.allowed) {
            const prefix = decision.hardLimit ? 'HARD_QUOTA_EXCEEDED' : 'SOFT_QUOTA_EXCEEDED';
            const details = decision.reason ? `${prefix}: ${decision.reason}` : prefix;
            throw new Error(details);
        }
    }
    resolveLimit(plan, dimension) {
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
exports.PostgresQuotaService = PostgresQuotaService;
class InMemoryQuotaDataSource {
    quotas = new Map();
    usage = new Map();
    constructor(initialQuotas = {}, initialUsage = {}) {
        Object.entries(initialQuotas).forEach(([tenantId, config]) => {
            this.setTenantQuota(tenantId, config);
        });
        Object.entries(initialUsage).forEach(([tenantId, totals]) => {
            this.setTenantUsage(tenantId, totals);
        });
    }
    async loadTenantQuota(tenantId) {
        return { ...(this.quotas.get(tenantId) || {}) };
    }
    async loadTenantUsage(tenantId) {
        return { ...(this.usage.get(tenantId) || {}) };
    }
    setTenantQuota(tenantId, config) {
        this.quotas.set(tenantId, { ...config });
    }
    setTenantUsage(tenantId, totals) {
        this.usage.set(tenantId, { ...totals });
    }
}
exports.InMemoryQuotaDataSource = InMemoryQuotaDataSource;
