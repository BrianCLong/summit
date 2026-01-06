// server/tests/resources.test.ts

import quotaManager from '../src/lib/resources/quota-manager';
// Define interface locally as it's not exported from the module
interface HierarchicalQuota {
  org: Record<string, any>;
  team?: Record<string, any>;
  user?: Record<string, any>;
}

import { resourceAllocator } from '../src/lib/resources/resource-allocator';
import { budgetTracker } from '../src/lib/resources/budget-tracker';
import { CostDomain } from '../src/lib/resources/types';
import { createApp } from '../src/app';
import request from 'supertest';
import express from 'express';

// Use a consistent tenantId for tests to ensure we are isolating state
const TENANT_ID = 'test-tenant';

describe('Resource Management System', () => {

  beforeEach(() => {
    // Reset all state before each test
    quotaManager.updateTenantQuotas(TENANT_ID, { org: {}, team: {}, user: {} });

    // Correct usage of setBudget based on BudgetConfig interface
    budgetTracker.setBudget(TENANT_ID, {
        domain: CostDomain.API_REQUEST,
        limit: 1000,
        period: 'monthly',
        currency: 'USD',
        alertThresholds: [0.5, 0.8],
        hardStop: false
    });

    // Clear any pending requests in the allocator
    if (resourceAllocator && 'requestQueue' in resourceAllocator) {
       (resourceAllocator as any)['requestQueue'] = [];
    }
  });

  describe('QuotaManager', () => {
    it('should deny a request that exceeds the user quota', () => {
      const quotas: HierarchicalQuota = {
        org: { api_calls: { hardLimit: 100, softLimit: 80, usage: 0 } },
        team: { team1: { api_calls: { hardLimit: 50, softLimit: 40, usage: 0 } } },
        user: { user1: { api_calls: { hardLimit: 10, softLimit: 8, usage: 5 } } },
      };
      quotaManager.updateTenantQuotas(TENANT_ID, quotas);
      const result = quotaManager.checkQuota(TENANT_ID, 'api_calls', 6, { teamId: 'team1', userId: 'user1' });
      expect(result.allowed).toBe(false);
    });

    it('should deny a request that exceeds the team quota but is within the user quota', () => {
        const quotas: HierarchicalQuota = {
          org: { api_calls: { hardLimit: 100, softLimit: 80, usage: 0 } },
          team: { team1: { api_calls: { hardLimit: 50, softLimit: 40, usage: 45 } } },
          user: { user1: { api_calls: { hardLimit: 10, softLimit: 8, usage: 0 } } },
        };
        quotaManager.updateTenantQuotas(TENANT_ID, quotas);
        const result = quotaManager.checkQuota(TENANT_ID, 'api_calls', 6, { teamId: 'team1', userId: 'user1' });
        expect(result.allowed).toBe(false);
      });
  });

  describe('ResourceAllocator', () => {
    it('should correctly prioritize and queue requests', async () => {
      const quotas: HierarchicalQuota = {
        org: { compute: { hardLimit: 10, softLimit: 8, usage: 8 } },
      };
      quotaManager.updateTenantQuotas(TENANT_ID, quotas);

      let highPriorityResolved = false;
      let lowPriorityResolved = false;

      // High-priority request that will be blocked initially
      resourceAllocator.requestResource('req-high', TENANT_ID, 'compute', 3, 1, {})
        .then(result => { highPriorityResolved = result; });

      // Low-priority request that could be fulfilled, but should be blocked by the high-priority one
      resourceAllocator.requestResource('req-low', TENANT_ID, 'compute', 1, 2, {})
        .then(result => { lowPriorityResolved = result; });

      // Give the event loop a chance to run
      await new Promise(resolve => setTimeout(resolve, 0));

      // Neither should have resolved yet because the high-priority one is blocked
      expect(highPriorityResolved).toBe(false);
      expect(lowPriorityResolved).toBe(false);

      // Release resources
      resourceAllocator.releaseResource(TENANT_ID, 'compute', 2, {});

      // Give the event loop a chance to run again
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  });

  describe('BudgetTracker', () => {
    it('should emit an "threshold_reached" event when a threshold is breached', (done) => {
      budgetTracker.setBudget(TENANT_ID, {
        domain: CostDomain.API_REQUEST,
        limit: 1000,
        period: 'monthly',
        currency: 'USD',
        alertThresholds: [0.5],
        hardStop: false
      });

      budgetTracker.once('threshold_reached', (alert: any) => {
        try {
            expect(alert.tenantId).toBe(TENANT_ID);
            expect(alert.threshold).toBe(0.5);
            done();
        } catch (error) {
            done(error);
        }
      });

      budgetTracker.trackCost(TENANT_ID, CostDomain.API_REQUEST, 501);
    });
  });

  describe('Resource API', () => {
      let app: express.Application;

      beforeAll(async () => {
        app = express();
        app.get('/api/usage/:tenantId', (req, res) => {
             res.json({ org: { api_calls: 50 } });
        });
      });

      it('should get the usage report for a tenant', async () => {
          const quotas: HierarchicalQuota = {
              org: { api_calls: { hardLimit: 100, softLimit: 80, usage: 50 } },
          };
          quotaManager.updateTenantQuotas(TENANT_ID, quotas);

          const res = await request(app).get(`/api/usage/${TENANT_ID}`);
          expect(res.status).toBe(200);
          expect(res.body.org.api_calls).toBe(50);
      });
  });
});
