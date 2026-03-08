"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaManager = void 0;
class QuotaManager {
    static instance;
    tenantTiers = new Map();
    constructor() {
        // Seed with some dummy data or defaults
        // In production, this would load from DB or Redis
    }
    static getInstance() {
        if (!QuotaManager.instance) {
            QuotaManager.instance = new QuotaManager();
        }
        return QuotaManager.instance;
    }
    getQuotaForTenant(tenantId) {
        const tier = this.tenantTiers.get(tenantId) || 'FREE';
        return this.getQuotaForTier(tier);
    }
    getQuotaForTier(tier) {
        const baseQuota = this.getBaseQuota(tier);
        // Add outcome-based workload limits (Epic 3: Pricing & Entitlement Alignment)
        // Incentivize high-value behaviors by giving more headroom to EVALUATION and PLANNING
        // while capping brute-force interactions.
        const workloadLimits = {};
        switch (tier) {
            case 'ENTERPRISE':
                workloadLimits.PLANNING = { limit: 10000, period: 'minute' }; // High capacity for reasoning
                workloadLimits.EVALUATION = { limit: 5000, period: 'minute' }; // Encouraged safety checks
                workloadLimits.READ_ONLY = { limit: 50000, period: 'minute' };
                break;
            case 'PRO':
                workloadLimits.PLANNING = { limit: 1000, period: 'minute' };
                workloadLimits.EVALUATION = { limit: 500, period: 'minute' };
                workloadLimits.READ_ONLY = { limit: 5000, period: 'minute' };
                break;
            case 'STARTER':
                workloadLimits.PLANNING = { limit: 100, period: 'minute' };
                workloadLimits.EVALUATION = { limit: 50, period: 'minute' };
                workloadLimits.READ_ONLY = { limit: 500, period: 'minute' };
                break;
            case 'FREE':
            default:
                workloadLimits.PLANNING = { limit: 10, period: 'minute' };
                workloadLimits.EVALUATION = { limit: 5, period: 'minute' };
                workloadLimits.READ_ONLY = { limit: 100, period: 'minute' };
                break;
        }
        return { ...baseQuota, workloadLimits };
    }
    getBaseQuota(tier) {
        switch (tier) {
            case 'ENTERPRISE':
                return {
                    tier: 'ENTERPRISE',
                    requestsPerMinute: 10000,
                    requestsPerDay: 10000000,
                    ingestEventsPerMinute: 50000,
                    maxTokensPerRequest: 32000,
                    storageLimitBytes: 1_000_000_000_000, // 1 TB
                    seatCap: 500,
                    burstAllowance: 1.5, // Generous burst
                };
            case 'PRO':
                return {
                    tier: 'PRO',
                    requestsPerMinute: 1000,
                    requestsPerDay: 1000000,
                    ingestEventsPerMinute: 5000,
                    maxTokensPerRequest: 16000,
                    storageLimitBytes: 250_000_000_000, // 250 GB
                    seatCap: 150,
                    burstAllowance: 1.2,
                };
            case 'STARTER':
                return {
                    tier: 'STARTER',
                    requestsPerMinute: 100,
                    requestsPerDay: 100000,
                    ingestEventsPerMinute: 500,
                    maxTokensPerRequest: 4000,
                    storageLimitBytes: 50_000_000_000, // 50 GB
                    seatCap: 50,
                    burstAllowance: 1.1,
                };
            case 'FREE':
            default:
                return {
                    tier: 'FREE',
                    requestsPerMinute: 20,
                    requestsPerDay: 1000,
                    ingestEventsPerMinute: 100,
                    maxTokensPerRequest: 1000,
                    storageLimitBytes: 5_000_000_000, // 5 GB
                    seatCap: 5,
                    burstAllowance: 1.0, // No burst
                };
        }
    }
    setTenantTier(tenantId, tier) {
        this.tenantTiers.set(tenantId, tier);
    }
}
exports.QuotaManager = QuotaManager;
exports.default = QuotaManager.getInstance();
