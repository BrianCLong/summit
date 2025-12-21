import { v4 as uuid } from 'uuid';

export type PlanName = 'free' | 'pro' | 'enterprise';

export type EntitlementPlan = {
  name: PlanName;
  version: string;
  limits: {
    seats: number;
    analyses: number;
    storageGb: number;
  };
  features: string[];
};

export type MeteredUsage = {
  seats: number;
  analyses: number;
  storageGb: number;
};

export type UpgradePrompt = {
  workspaceId: string;
  reason: 'aha_complete' | 'limit_near' | 'limit_exceeded';
  metric: keyof MeteredUsage;
  current: number;
  limit: number;
  suggestedPlan: PlanName;
};

export class EntitlementService {
  private plans: Record<PlanName, EntitlementPlan> = {
    free: {
      name: 'free',
      version: '2025.12',
      limits: { seats: 5, analyses: 25, storageGb: 5 },
      features: ['starter-data', 'guided-setup'],
    },
    pro: {
      name: 'pro',
      version: '2025.12',
      limits: { seats: 25, analyses: 250, storageGb: 25 },
      features: ['starter-data', 'guided-setup', 'checklists', 'alerts'],
    },
    enterprise: {
      name: 'enterprise',
      version: '2025.12',
      limits: { seats: 2500, analyses: 25000, storageGb: 2500 },
      features: ['starter-data', 'guided-setup', 'checklists', 'alerts', 'sso', 'scim'],
    },
  };

  private usage = new Map<string, MeteredUsage>();
  private appliedEvents = new Set<string>();

  getPlan(plan: PlanName): EntitlementPlan {
    return this.plans[plan];
  }

  getUsage(workspaceId: string): MeteredUsage {
    if (!this.usage.has(workspaceId)) {
      this.usage.set(workspaceId, { seats: 0, analyses: 0, storageGb: 0 });
    }
    return this.usage.get(workspaceId)!;
  }

  meterUsage(
    workspaceId: string,
    plan: PlanName,
    metric: keyof MeteredUsage,
    amount: number,
    eventId: string = uuid(),
  ): { allowed: boolean; prompt?: UpgradePrompt } {
    if (this.appliedEvents.has(eventId)) {
      return { allowed: true };
    }
    this.appliedEvents.add(eventId);

    const usage = this.getUsage(workspaceId);
    usage[metric] += amount;
    const planLimits = this.getPlan(plan).limits[metric];
    const threshold = planLimits * 0.9;

    if (usage[metric] > planLimits) {
      return {
        allowed: false,
        prompt: {
          workspaceId,
          reason: 'limit_exceeded',
          metric,
          current: usage[metric],
          limit: planLimits,
          suggestedPlan: this.nextPlan(plan),
        },
      };
    }

    if (usage[metric] >= threshold) {
      return {
        allowed: true,
        prompt: {
          workspaceId,
          reason: 'limit_near',
          metric,
          current: usage[metric],
          limit: planLimits,
          suggestedPlan: this.nextPlan(plan),
        },
      };
    }

    return { allowed: true };
  }

  buildAhaPrompt(workspaceId: string, plan: PlanName): UpgradePrompt {
    const planDetails = this.getPlan(plan);
    return {
      workspaceId,
      reason: 'aha_complete',
      metric: 'analyses',
      current: this.getUsage(workspaceId).analyses,
      limit: planDetails.limits.analyses,
      suggestedPlan: this.nextPlan(plan),
    };
  }

  private nextPlan(plan: PlanName): PlanName {
    if (plan === 'free') return 'pro';
    if (plan === 'pro') return 'enterprise';
    return 'enterprise';
  }
}
