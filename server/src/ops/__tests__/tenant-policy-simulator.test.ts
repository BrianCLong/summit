/**
 * Tests for Tenant Policy Simulator
 * Deterministic, no network dependencies
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { tenantPolicySimulator } from '../tenant-policy-simulator.js';
import type { SimulationInput } from '../tenant-policy-simulator.js';

describe('TenantPolicySimulator', () => {
  describe('simulate()', () => {
    it('should allow admin to read any resource', async () => {
      const input: SimulationInput = {
        tenantId: 'tenant-001',
        actor: { id: 'user-admin', roles: ['admin'] },
        action: 'read',
        resource: { type: 'case', id: 'case-123' },
      };

      const result = await tenantPolicySimulator.simulate(input);

      expect(result.decision).toBe('allow');
      expect(result.ruleId).toBe('abac.allow');
      expect(result.reasons).toContain('All authorization checks passed');
    });

    it('should deny cross-tenant access for non-admin', async () => {
      const input: SimulationInput = {
        tenantId: 'tenant-001',
        actor: { id: 'user-analyst', roles: ['analyst'] },
        action: 'read',
        resource: {
          type: 'case',
          id: 'case-456',
          attributes: { tenantId: 'tenant-002' },
        },
      };

      const result = await tenantPolicySimulator.simulate(input);

      expect(result.decision).toBe('deny');
      expect(result.ruleId).toBe('tenant_isolation');
      expect(result.reasons?.[0]).toContain('Cross-tenant access denied');
    });

    it('should allow analyst to read resource in own tenant', async () => {
      const input: SimulationInput = {
        tenantId: 'tenant-001',
        actor: { id: 'user-analyst', roles: ['analyst'] },
        action: 'read',
        resource: {
          type: 'case',
          id: 'case-789',
          attributes: { tenantId: 'tenant-001', ownerId: 'user-analyst' },
        },
      };

      const result = await tenantPolicySimulator.simulate(input);

      expect(result.decision).toBe('allow');
    });

    it('should deny write action for viewer role', async () => {
      const input: SimulationInput = {
        tenantId: 'tenant-001',
        actor: { id: 'user-viewer', roles: ['viewer'] },
        action: 'write',
        resource: {
          type: 'case',
          id: 'case-101',
          attributes: { tenantId: 'tenant-001' },
        },
      };

      const result = await tenantPolicySimulator.simulate(input);

      expect(result.decision).toBe('deny');
      expect(result.ruleId).toBe('action_permissions');
      expect(result.reasons?.[0]).toContain('Viewer role cannot perform action');
    });

    it('should deny analyst from deleting resources', async () => {
      const input: SimulationInput = {
        tenantId: 'tenant-001',
        actor: { id: 'user-analyst', roles: ['analyst'] },
        action: 'delete',
        resource: {
          type: 'evidence',
          id: 'evidence-001',
          attributes: { tenantId: 'tenant-001' },
        },
      };

      const result = await tenantPolicySimulator.simulate(input);

      expect(result.decision).toBe('deny');
      expect(result.ruleId).toBe('action_permissions');
    });

    it('should allow operator to manage workflows', async () => {
      const input: SimulationInput = {
        tenantId: 'tenant-001',
        actor: { id: 'user-ops', roles: ['operator'] },
        action: 'workflow:manage',
        resource: {
          type: 'workflow',
          id: 'workflow-001',
          attributes: { tenantId: 'tenant-001' },
        },
      };

      const result = await tenantPolicySimulator.simulate(input);

      expect(result.decision).toBe('allow');
    });

    it('should include trace in simulation result', async () => {
      const input: SimulationInput = {
        tenantId: 'tenant-001',
        actor: { id: 'user-admin', roles: ['admin'] },
        action: 'read',
        resource: { type: 'case', id: 'case-123' },
      };

      const result = await tenantPolicySimulator.simulate(input);

      expect(result.trace).toBeDefined();
      expect(result.trace?.steps).toHaveLength(4);
      expect(result.trace?.steps[0].rule).toBe('tenant_isolation');
      expect(result.evaluatedAt).toBeDefined();
    });

    it('should return error for invalid input - missing tenantId', async () => {
      const input = {
        actor: { id: 'user-admin', roles: ['admin'] },
        action: 'read',
        resource: { type: 'case', id: 'case-123' },
      } as any;

      const result = await tenantPolicySimulator.simulate(input);

      expect(result.decision).toBe('deny');
      expect(result.ruleId).toBe('error');
      expect(result.reasons?.[0]).toContain('Valid tenantId is required');
    });

    it('should return error for invalid input - missing actor roles', async () => {
      const input = {
        tenantId: 'tenant-001',
        actor: { id: 'user-admin' },
        action: 'read',
        resource: { type: 'case', id: 'case-123' },
      } as any;

      const result = await tenantPolicySimulator.simulate(input);

      expect(result.decision).toBe('deny');
      expect(result.ruleId).toBe('error');
    });
  });

  describe('getFixtures()', () => {
    it('should return predefined fixtures', () => {
      const fixtures = tenantPolicySimulator.getFixtures();

      expect(fixtures).toHaveLength(6);
      expect(fixtures[0]).toHaveProperty('id');
      expect(fixtures[0]).toHaveProperty('name');
      expect(fixtures[0]).toHaveProperty('description');
      expect(fixtures[0]).toHaveProperty('input');
      expect(fixtures[0]).toHaveProperty('expectedDecision');
    });

    it('should have valid fixture structure', () => {
      const fixtures = tenantPolicySimulator.getFixtures();

      fixtures.forEach(fixture => {
        expect(fixture.input.tenantId).toBeDefined();
        expect(fixture.input.actor).toBeDefined();
        expect(fixture.input.action).toBeDefined();
        expect(fixture.input.resource).toBeDefined();
        expect(['allow', 'deny']).toContain(fixture.expectedDecision);
      });
    });
  });

  describe('runFixtures()', () => {
    it('should run all fixtures and return results', async () => {
      const results = await tenantPolicySimulator.runFixtures();

      expect(results).toHaveLength(6);
      results.forEach(result => {
        expect(result.fixture).toBeDefined();
        expect(result.result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });
    });

    it('should pass all predefined fixtures', async () => {
      const results = await tenantPolicySimulator.runFixtures();

      const allPassed = results.every(r => r.passed);
      expect(allPassed).toBe(true);

      const failedFixtures = results.filter(r => !r.passed);
      if (failedFixtures.length > 0) {
        console.log('Failed fixtures:', failedFixtures);
      }
    });

    it('should match expected decisions for all fixtures', async () => {
      const results = await tenantPolicySimulator.runFixtures();

      results.forEach(({ fixture, result, passed }) => {
        expect(result.decision).toBe(fixture.expectedDecision);
        expect(passed).toBe(true);
      });
    });
  });

  describe('deterministic behavior', () => {
    it('should return consistent results for same input', async () => {
      const input: SimulationInput = {
        tenantId: 'tenant-001',
        actor: { id: 'user-admin', roles: ['admin'] },
        action: 'read',
        resource: { type: 'case', id: 'case-123' },
      };

      const result1 = await tenantPolicySimulator.simulate(input);
      const result2 = await tenantPolicySimulator.simulate(input);

      expect(result1.decision).toBe(result2.decision);
      expect(result1.ruleId).toBe(result2.ruleId);
      expect(result1.trace?.steps.length).toBe(result2.trace?.steps.length);
    });

    it('should complete quickly (< 100ms)', async () => {
      const input: SimulationInput = {
        tenantId: 'tenant-001',
        actor: { id: 'user-admin', roles: ['admin'] },
        action: 'read',
        resource: { type: 'case', id: 'case-123' },
      };

      const start = Date.now();
      await tenantPolicySimulator.simulate(input);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
