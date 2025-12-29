export interface Plan {
  id: string;
  name: string;
  limits: {
    // Basic limits
    maxUsers: number;
    maxStorageBytes: number;

    // Usage quotas (monthly)
    monthlyRequests: number;
    monthlyComputeMs: number;
    monthlyLlmTokens: number;
  };
  features: string[];
}

export const PLANS: Record<string, Plan> = {
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

export class PlanService {
  private tenantPlans = new Map<string, string>(); // TenantID -> PlanID

  constructor() {
    // Seed default plan
    this.tenantPlans.set('default', 'FREE');
  }

  async getPlanForTenant(tenantId: string): Promise<Plan> {
    const planId = this.tenantPlans.get(tenantId) || 'FREE';
    return PLANS[planId] || PLANS['FREE'];
  }

  async setPlanForTenant(tenantId: string, planId: string): Promise<void> {
    if (!PLANS[planId]) {
      throw new Error(`Invalid plan ID: ${planId}`);
    }
    this.tenantPlans.set(tenantId, planId);
  }
}

export const planService = new PlanService();
