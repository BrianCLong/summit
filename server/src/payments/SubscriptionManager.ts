import crypto from 'crypto';

export type BillingInterval = 'month' | 'year' | 'week';
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'trialing'
  | 'paused';

export interface Plan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: BillingInterval;
  features: string[];
  trialDays: number;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageRecord {
  subscriptionId: string;
  metricName: string;
  quantity: number;
  timestamp: Date;
}

export class SubscriptionManager {
  private plans: Map<string, Plan> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private usageRecords: UsageRecord[] = [];

  constructor() {
    this.initializeDefaultPlans();
  }

  private initializeDefaultPlans(): void {
    const defaultPlans: Plan[] = [
      {
        id: 'plan_starter',
        name: 'Starter',
        amount: 2900,
        currency: 'usd',
        interval: 'month',
        features: ['5 users', '10GB storage', 'Email support'],
        trialDays: 14,
      },
      {
        id: 'plan_professional',
        name: 'Professional',
        amount: 9900,
        currency: 'usd',
        interval: 'month',
        features: ['25 users', '100GB storage', 'Priority support', 'API access'],
        trialDays: 14,
      },
      {
        id: 'plan_enterprise',
        name: 'Enterprise',
        amount: 29900,
        currency: 'usd',
        interval: 'month',
        features: [
          'Unlimited users',
          '1TB storage',
          'Dedicated support',
          'API access',
          'SSO',
          'Audit logs',
        ],
        trialDays: 30,
      },
    ];

    for (const plan of defaultPlans) {
      this.plans.set(plan.id, plan);
    }
  }

  async createSubscription(params: {
    customerId: string;
    planId: string;
    startTrial?: boolean;
  }): Promise<Subscription> {
    const plan = this.plans.get(params.planId);
    if (!plan) throw new Error('plan_not_found');

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    let trialEnd: Date | undefined;
    if (params.startTrial && plan.trialDays > 0) {
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
    }

    const subscription: Subscription = {
      id: `sub_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
      customerId: params.customerId,
      planId: params.planId,
      status: trialEnd ? 'trialing' : 'active',
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd || periodEnd,
      cancelAtPeriodEnd: false,
      trialEnd,
      createdAt: now,
      updatedAt: now,
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  async cancelSubscription(
    subscriptionId: string,
    immediately = false,
  ): Promise<Subscription> {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) throw new Error('subscription_not_found');

    if (immediately) {
      sub.status = 'cancelled';
    } else {
      sub.cancelAtPeriodEnd = true;
    }
    sub.updatedAt = new Date();

    return sub;
  }

  async changePlan(
    subscriptionId: string,
    newPlanId: string,
  ): Promise<Subscription> {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) throw new Error('subscription_not_found');

    const plan = this.plans.get(newPlanId);
    if (!plan) throw new Error('plan_not_found');

    sub.planId = newPlanId;
    sub.updatedAt = new Date();

    return sub;
  }

  async recordUsage(record: Omit<UsageRecord, 'timestamp'>): Promise<void> {
    this.usageRecords.push({
      ...record,
      timestamp: new Date(),
    });
  }

  async getUsage(
    subscriptionId: string,
    metricName: string,
    since: Date,
  ): Promise<number> {
    return this.usageRecords
      .filter(
        (r) =>
          r.subscriptionId === subscriptionId &&
          r.metricName === metricName &&
          r.timestamp >= since,
      )
      .reduce((sum, r) => sum + r.quantity, 0);
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return this.subscriptions.get(subscriptionId) || null;
  }

  async listSubscriptions(customerId: string): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values()).filter(
      (s) => s.customerId === customerId,
    );
  }

  async listPlans(): Promise<Plan[]> {
    return Array.from(this.plans.values());
  }
}

export default SubscriptionManager;
