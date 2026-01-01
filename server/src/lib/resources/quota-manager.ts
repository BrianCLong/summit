export interface Quota {
    tier: 'FREE' | 'CORE' | 'PRO' | 'ENTERPRISE';
    requestsPerMinute: number;
    ingestEventsPerMinute: number;
    maxTokensPerRequest: number;
    storageLimitBytes: number;
    seatCap: number;
    features: {
        sso: boolean;
        auditLogsRetentionDays: number;
        advancedGraphAnalytics: boolean;
        customRoles: boolean;
        dataResidency: boolean;
        prioritySupport: boolean;
        sla: boolean;
    };
}

export class QuotaManager {
    private static instance: QuotaManager;
    private tenantTiers: Map<string, 'FREE' | 'CORE' | 'PRO' | 'ENTERPRISE'> = new Map();

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
        switch (tier) {
            case 'ENTERPRISE':
                return {
                    tier: 'ENTERPRISE',
                    requestsPerMinute: 10000,
                    ingestEventsPerMinute: 50000,
                    maxTokensPerRequest: 32000,
                    storageLimitBytes: 1_000_000_000_000, // 1 TB
                    seatCap: Infinity,
                    features: {
                        sso: true,
                        auditLogsRetentionDays: 365,
                        advancedGraphAnalytics: true,
                        customRoles: true,
                        dataResidency: true,
                        prioritySupport: true,
                        sla: true
                    }
                };
            case 'PRO':
                return {
                    tier: 'PRO',
                    requestsPerMinute: 1000,
                    ingestEventsPerMinute: 5000,
                    maxTokensPerRequest: 16000,
                    storageLimitBytes: 250_000_000_000, // 250 GB
                    seatCap: 20,
                    features: {
                        sso: true,
                        auditLogsRetentionDays: 30,
                        advancedGraphAnalytics: true,
                        customRoles: false,
                        dataResidency: false,
                        prioritySupport: true,
                        sla: false
                    }
                };
            case 'CORE':
            case 'STARTER': // Backwards compatibility alias
                return {
                    tier: 'CORE',
                    requestsPerMinute: 100,
                    ingestEventsPerMinute: 500,
                    maxTokensPerRequest: 4000,
                    storageLimitBytes: 50_000_000_000, // 50 GB
                    seatCap: 5,
                    features: {
                        sso: false,
                        auditLogsRetentionDays: 7,
                        advancedGraphAnalytics: false,
                        customRoles: false,
                        dataResidency: false,
                        prioritySupport: false,
                        sla: false
                    }
                };
            case 'FREE':
            default:
                return {
                    tier: 'FREE',
                    requestsPerMinute: 20,
                    ingestEventsPerMinute: 100,
                    maxTokensPerRequest: 1000,
                    storageLimitBytes: 5_000_000_000, // 5 GB
                    seatCap: 5,
                    features: {
                        sso: false,
                        auditLogsRetentionDays: 1,
                        advancedGraphAnalytics: false,
                        customRoles: false,
                        dataResidency: false,
                        prioritySupport: false,
                        sla: false
                    }
                };
        }
    }

    public setTenantTier(tenantId: string, tier: 'FREE' | 'CORE' | 'PRO' | 'ENTERPRISE') {
        this.tenantTiers.set(tenantId, tier);
    }
}

export default QuotaManager.getInstance();
