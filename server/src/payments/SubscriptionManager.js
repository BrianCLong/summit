"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
class SubscriptionManager {
    plans = new Map();
    subscriptions = new Map();
    usageRecords = [];
    constructor() {
        this.initializeDefaultPlans();
    }
    initializeDefaultPlans() {
        const defaultPlans = [
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
    async createSubscription(params) {
        const plan = this.plans.get(params.planId);
        if (!plan)
            throw new Error('plan_not_found');
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        let trialEnd;
        if (params.startTrial && plan.trialDays > 0) {
            trialEnd = new Date(now);
            trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
        }
        const subscription = {
            id: `sub_${crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 24)}`,
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
    async cancelSubscription(subscriptionId, immediately = false) {
        const sub = this.subscriptions.get(subscriptionId);
        if (!sub)
            throw new Error('subscription_not_found');
        if (immediately) {
            sub.status = 'cancelled';
        }
        else {
            sub.cancelAtPeriodEnd = true;
        }
        sub.updatedAt = new Date();
        return sub;
    }
    async changePlan(subscriptionId, newPlanId) {
        const sub = this.subscriptions.get(subscriptionId);
        if (!sub)
            throw new Error('subscription_not_found');
        const plan = this.plans.get(newPlanId);
        if (!plan)
            throw new Error('plan_not_found');
        sub.planId = newPlanId;
        sub.updatedAt = new Date();
        return sub;
    }
    async recordUsage(record) {
        this.usageRecords.push({
            ...record,
            timestamp: new Date(),
        });
    }
    async getUsage(subscriptionId, metricName, since) {
        return this.usageRecords
            .filter((r) => r.subscriptionId === subscriptionId &&
            r.metricName === metricName &&
            r.timestamp >= since)
            .reduce((sum, r) => sum + r.quantity, 0);
    }
    async getSubscription(subscriptionId) {
        return this.subscriptions.get(subscriptionId) || null;
    }
    async listSubscriptions(customerId) {
        return Array.from(this.subscriptions.values()).filter((s) => s.customerId === customerId);
    }
    async listPlans() {
        return Array.from(this.plans.values());
    }
}
exports.SubscriptionManager = SubscriptionManager;
exports.default = SubscriptionManager;
