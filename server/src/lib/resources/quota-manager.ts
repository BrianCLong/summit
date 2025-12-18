export interface Quota {
    tier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
    requestsPerMinute: number;
    maxTokensPerRequest: number;
}

export class QuotaManager {
    private static instance: QuotaManager;
    private tenantTiers: Map<string, 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'> = new Map();

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
                return { tier: 'ENTERPRISE', requestsPerMinute: 10000, maxTokensPerRequest: 32000 };
            case 'PRO':
                return { tier: 'PRO', requestsPerMinute: 1000, maxTokensPerRequest: 16000 };
            case 'STARTER':
                return { tier: 'STARTER', requestsPerMinute: 100, maxTokensPerRequest: 4000 };
            case 'FREE':
            default:
                return { tier: 'FREE', requestsPerMinute: 20, maxTokensPerRequest: 1000 };
        }
    }

    public setTenantTier(tenantId: string, tier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE') {
        this.tenantTiers.set(tenantId, tier);
    }
}

export default QuotaManager.getInstance();
