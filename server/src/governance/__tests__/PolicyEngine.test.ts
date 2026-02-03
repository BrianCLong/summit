import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PolicyEngine } from '../PolicyEngine.js';
import { Policy, PolicyContext, GovernanceVerdict } from '../types.js';

describe('PolicyEngine MVP-3 GA', () => {
  const policyEngine = new PolicyEngine();

  const testPolicy: Policy = {
    id: 'test-policy-1',
    description: 'Deny if risk is high',
    scope: {
      stages: ['runtime'],
      tenants: ['*']
    },
    action: 'DENY',
    rules: [
      {
        field: 'riskLevel',
        operator: 'gt',
        value: 80
      }
    ]
  };

  beforeAll(() => {
    policyEngine.loadPolicies([testPolicy]);
  });

  it('should allow when rules do not match', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-1',
      payload: {
        riskLevel: 50
      }
    };

    const verdict = policyEngine.check(context);

    expect(verdict.action).toBe('ALLOW');
    expect(verdict.policyIds).toHaveLength(0);
    expect(verdict.provenance).toBeDefined();
    expect(verdict.provenance.origin).toBe('system-policy-check');
    expect(verdict.metadata.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should deny when rules match', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-1',
      payload: {
        riskLevel: 90
      }
    };

    const verdict = policyEngine.check(context);

    expect(verdict.action).toBe('DENY');
    expect(verdict.policyIds).toContain('test-policy-1');
    expect(verdict.reasons.join(' ')).toMatch(/policy|deny/i);
  });

  it('should include provenance and metadata', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-1',
      payload: { riskLevel: 50 },
      simulation: true
    };

    const verdict = policyEngine.check(context);

    expect(verdict.metadata.simulation).toBe(true);
    expect(verdict.metadata.evaluator).toBe('native-policy-engine-v1');
    expect(verdict.provenance.confidence).toBe(1.0);
  });
});
