import { WorkloadClass, ResourceLimit } from './types.js';

export interface Quota {
    tier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
    requestsPerMinute: number;
    requestsPerDay: number;
    ingestEventsPerMinute: number;
    maxTokensPerRequest: number;
    storageLimitBytes: number;
    seatCap: number;
    burstAllowance: number; // Multiplier, e.g. 1.1 for 10% burst
    workloadLimits?: Partial<Record<WorkloadClass, ResourceLimit>>;
}

export interface HierarchicalQuota {
    org: Record<string, any>;
    team?: Record<string, any>;
    user?: Record<string, any>;
}

export class QuotaManager {
    private static instance: QuotaManager;
    private tenantTiers: Map<string, 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'> = new Map();
    // In-memory store for hierarchical quotas for testing/prototype
    private tenantQuotas: Map<string, HierarchicalQuota> = new Map();

    private constructor() {
        // Seed with some dummy data or defaults
        // In production, this would load from DB or Redis
    }

    public static getInstance(): QuotaManager {
        if (!QuotaManager.instance) {
            QuotaManager.instance = new QuotaManager();
        }
        return QuotaManager.instance;
    }

    public getQuotaForTenant(tenantId: string): Quota {
        const tier = this.tenantTiers.get(tenantId) || 'FREE';
        return this.getQuotaForTier(tier);
    }

    public getQuotaForTier(tier: string): Quota {
        const baseQuota: Quota = this.getBaseQuota(tier);

        // Add outcome-based workload limits (Epic 3: Pricing & Entitlement Alignment)
        // Incentivize high-value behaviors by giving more headroom to EVALUATION and PLANNING
        // while capping brute-force interactions.
        const workloadLimits: Partial<Record<WorkloadClass, ResourceLimit>> = {};

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

    private getBaseQuota(tier: string): Quota {
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

    public setTenantTier(tenantId: string, tier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE') {
        this.tenantTiers.set(tenantId, tier);
    }

    public updateTenantQuotas(tenantId: string, quotas: HierarchicalQuota) {
        this.tenantQuotas.set(tenantId, quotas);
    }

    public checkQuota(tenantId: string, metric: string, amount: number, context?: { teamId?: string; userId?: string }): { allowed: boolean; reason?: string } {
        const quotas = this.tenantQuotas.get(tenantId);
        if (!quotas) return { allowed: true }; // No quotas defined, allow

        // Check org level
        if (quotas.org[metric]) {
            const limit = quotas.org[metric].hardLimit;
            const usage = quotas.org[metric].usage || 0;
            if (usage + amount > limit) return { allowed: false, reason: 'Org quota exceeded' };
        }

        // Check team level
        if (context?.teamId && quotas.team?.[context.teamId]?.[metric]) {
             const limit = quotas.team[context.teamId][metric].hardLimit;
             const usage = quotas.team[context.teamId][metric].usage || 0;
             if (usage + amount > limit) return { allowed: false, reason: 'Team quota exceeded' };
        }

        // Check user level
        if (context?.userId && quotas.user?.[context.userId]?.[metric]) {
             const limit = quotas.user[context.userId][metric].hardLimit;
             const usage = quotas.user[context.userId][metric].usage || 0;
             if (usage + amount > limit) return { allowed: false, reason: 'User quota exceeded' };
        }

        return { allowed: true };
    }
}

export default QuotaManager.getInstance();
