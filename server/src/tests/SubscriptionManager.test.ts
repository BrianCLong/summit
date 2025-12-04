import { SubscriptionManager } from '../payments/SubscriptionManager';

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  describe('listPlans', () => {
    it('should return default plans', async () => {
      const plans = await manager.listPlans();
      expect(plans.length).toBeGreaterThan(0);
      expect(plans.some((p) => p.id === 'plan_starter')).toBe(true);
    });
  });

  describe('createSubscription', () => {
    it('should create an active subscription', async () => {
      const sub = await manager.createSubscription({
        customerId: 'cust_sub_test',
        planId: 'plan_professional',
      });

      expect(sub.id).toMatch(/^sub_/);
      expect(sub.status).toBe('active');
      expect(sub.planId).toBe('plan_professional');
    });

    it('should create a trialing subscription', async () => {
      const sub = await manager.createSubscription({
        customerId: 'cust_trial',
        planId: 'plan_starter',
        startTrial: true,
      });

      expect(sub.status).toBe('trialing');
      expect(sub.trialEnd).toBeDefined();
    });

    it('should throw for invalid plan', async () => {
      await expect(
        manager.createSubscription({
          customerId: 'cust_x',
          planId: 'plan_invalid',
        }),
      ).rejects.toThrow('plan_not_found');
    });
  });

  describe('cancelSubscription', () => {
    it('should mark subscription to cancel at period end', async () => {
      const sub = await manager.createSubscription({
        customerId: 'cust_cancel',
        planId: 'plan_starter',
      });

      const cancelled = await manager.cancelSubscription(sub.id);
      expect(cancelled.cancelAtPeriodEnd).toBe(true);
      expect(cancelled.status).toBe('active');
    });

    it('should cancel immediately when requested', async () => {
      const sub = await manager.createSubscription({
        customerId: 'cust_immediate',
        planId: 'plan_starter',
      });

      const cancelled = await manager.cancelSubscription(sub.id, true);
      expect(cancelled.status).toBe('cancelled');
    });
  });

  describe('changePlan', () => {
    it('should upgrade plan', async () => {
      const sub = await manager.createSubscription({
        customerId: 'cust_upgrade',
        planId: 'plan_starter',
      });

      const upgraded = await manager.changePlan(sub.id, 'plan_enterprise');
      expect(upgraded.planId).toBe('plan_enterprise');
    });
  });

  describe('usage tracking', () => {
    it('should record and retrieve usage', async () => {
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
      expect(usage).toBe(150);
    });
  });
});
