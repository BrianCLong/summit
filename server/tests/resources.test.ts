// server/tests/resources.test.ts

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import quotaManager from '../src/lib/resources/quota-manager';
import { budgetTracker } from '../src/lib/resources/budget-tracker';
import { CostDomain } from '../src/lib/resources/types';

// Use a consistent tenantId for tests to ensure we are isolating state
const TENANT_ID = 'test-tenant';

describe('Resource Management System', () => {

  beforeEach(() => {
    budgetTracker.removeAllListeners();
  });

  describe('QuotaManager', () => {
    it('returns the default FREE tier when no tenant override exists', () => {
      const quota = quotaManager.getQuotaForTenant(TENANT_ID);
      expect(quota.tier).toBe('FREE');
      expect(quota.requestsPerMinute).toBeGreaterThan(0);
    });

    it('returns tier-specific quotas after setting a tenant tier', () => {
      quotaManager.setTenantTier(TENANT_ID, 'PRO');
      const quota = quotaManager.getQuotaForTenant(TENANT_ID);
      expect(quota.tier).toBe('PRO');
      expect(quota.requestsPerMinute).toBeGreaterThan(100);
    });
  });

  describe('BudgetTracker', () => {
    it('emits a threshold_reached event when alert thresholds are crossed', (done) => {
      budgetTracker.setBudget(TENANT_ID, {
        domain: CostDomain.API_REQUEST,
        limit: 1000,
        period: 'monthly',
        currency: 'USD',
        alertThresholds: [0.5],
        hardStop: false,
      });

      budgetTracker.on('threshold_reached', (alert: { tenantId: string; domain: CostDomain; threshold: number }) => {
        expect(alert.tenantId).toBe(TENANT_ID);
        expect(alert.domain).toBe(CostDomain.API_REQUEST);
        expect(alert.threshold).toBe(0.5);
        done();
      });

      budgetTracker.trackCost(TENANT_ID, CostDomain.API_REQUEST, 600, {
        operation: 'test',
      });
    });
  });
});
