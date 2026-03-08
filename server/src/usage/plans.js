"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planService = exports.PlanService = exports.PLANS = void 0;
exports.PLANS = {
    FREE: {
        id: 'plan_free',
        name: 'Free Tier',
        limits: {
            maxUsers: 5,
            maxStorageBytes: 1024 * 1024 * 1024, // 1GB
            monthlyRequests: 10_000,
            monthlyComputeMs: 60 * 60 * 1000, // 1 hour
            monthlyLlmTokens: 100_000,
        },
        features: ['basic_analytics', 'community_support'],
    },
    PRO: {
        id: 'plan_pro',
        name: 'Pro Tier',
        limits: {
            maxUsers: 50,
            maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50GB
            monthlyRequests: 1_000_000,
            monthlyComputeMs: 100 * 60 * 60 * 1000, // 100 hours
            monthlyLlmTokens: 10_000_000,
        },
        features: ['advanced_analytics', 'email_support', 'maestro_access'],
    },
    ENTERPRISE: {
        id: 'plan_ent',
        name: 'Enterprise Tier',
        limits: {
            maxUsers: 999999,
            maxStorageBytes: 1024 * 1024 * 1024 * 1024 * 10, // 10TB
            monthlyRequests: 1_000_000_000,
            monthlyComputeMs: 10000 * 60 * 60 * 1000,
            monthlyLlmTokens: 1_000_000_000,
        },
        features: ['all_features', 'dedicated_support', 'sso'],
    },
};
class PlanService {
    tenantPlans = new Map(); // TenantID -> PlanID
    constructor() {
        // Seed default plan
        this.tenantPlans.set('default', 'FREE');
    }
    async getPlanForTenant(tenantId) {
        const planId = this.tenantPlans.get(tenantId) || 'FREE';
        return exports.PLANS[planId] || exports.PLANS['FREE'];
    }
    async setPlanForTenant(tenantId, planId) {
        if (!exports.PLANS[planId]) {
            throw new Error(`Invalid plan ID: ${planId}`);
        }
        this.tenantPlans.set(tenantId, planId);
    }
}
exports.PlanService = PlanService;
exports.planService = new PlanService();
