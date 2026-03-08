"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SubscriptionManager_js_1 = require("../payments/SubscriptionManager.js");
(0, globals_1.describe)('SubscriptionManager', () => {
    let manager;
    (0, globals_1.beforeEach)(() => {
        manager = new SubscriptionManager_js_1.SubscriptionManager();
    });
    (0, globals_1.describe)('listPlans', () => {
        (0, globals_1.it)('should return default plans', async () => {
            const plans = await manager.listPlans();
            (0, globals_1.expect)(plans.length).toBeGreaterThan(0);
            (0, globals_1.expect)(plans.some((p) => p.id === 'plan_starter')).toBe(true);
        });
    });
    (0, globals_1.describe)('createSubscription', () => {
        (0, globals_1.it)('should create an active subscription', async () => {
            const sub = await manager.createSubscription({
                customerId: 'cust_sub_test',
                planId: 'plan_professional',
            });
            (0, globals_1.expect)(sub.id).toMatch(/^sub_/);
            (0, globals_1.expect)(sub.status).toBe('active');
            (0, globals_1.expect)(sub.planId).toBe('plan_professional');
        });
        (0, globals_1.it)('should create a trialing subscription', async () => {
            const sub = await manager.createSubscription({
                customerId: 'cust_trial',
                planId: 'plan_starter',
                startTrial: true,
            });
            (0, globals_1.expect)(sub.status).toBe('trialing');
            (0, globals_1.expect)(sub.trialEnd).toBeDefined();
        });
        (0, globals_1.it)('should throw for invalid plan', async () => {
            await (0, globals_1.expect)(manager.createSubscription({
                customerId: 'cust_x',
                planId: 'plan_invalid',
            })).rejects.toThrow('plan_not_found');
        });
    });
    (0, globals_1.describe)('cancelSubscription', () => {
        (0, globals_1.it)('should mark subscription to cancel at period end', async () => {
            const sub = await manager.createSubscription({
                customerId: 'cust_cancel',
                planId: 'plan_starter',
            });
            const cancelled = await manager.cancelSubscription(sub.id);
            (0, globals_1.expect)(cancelled.cancelAtPeriodEnd).toBe(true);
            (0, globals_1.expect)(cancelled.status).toBe('active');
        });
        (0, globals_1.it)('should cancel immediately when requested', async () => {
            const sub = await manager.createSubscription({
                customerId: 'cust_immediate',
                planId: 'plan_starter',
            });
            const cancelled = await manager.cancelSubscription(sub.id, true);
            (0, globals_1.expect)(cancelled.status).toBe('cancelled');
        });
    });
    (0, globals_1.describe)('changePlan', () => {
        (0, globals_1.it)('should upgrade plan', async () => {
            const sub = await manager.createSubscription({
                customerId: 'cust_upgrade',
                planId: 'plan_starter',
            });
            const upgraded = await manager.changePlan(sub.id, 'plan_enterprise');
            (0, globals_1.expect)(upgraded.planId).toBe('plan_enterprise');
        });
    });
    (0, globals_1.describe)('usage tracking', () => {
        (0, globals_1.it)('should record and retrieve usage', async () => {
            const sub = await manager.createSubscription({
                customerId: 'cust_usage',
                planId: 'plan_professional',
            });
            await manager.recordUsage({
                subscriptionId: sub.id,
                metricName: 'api_calls',
                quantity: 100,
            });
            await manager.recordUsage({
                subscriptionId: sub.id,
                metricName: 'api_calls',
                quantity: 50,
            });
            const since = new Date(Date.now() - 60000);
            const usage = await manager.getUsage(sub.id, 'api_calls', since);
            (0, globals_1.expect)(usage).toBe(150);
        });
    });
});
