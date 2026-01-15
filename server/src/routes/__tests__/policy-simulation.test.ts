import { describe, it, expect } from '@jest/globals';
import { simulatePolicyDecision } from '../../policy/tenantBundle.js';
import { Profiles } from '../../policy/profiles.js';

describe('Policy Simulation (core evaluator)', () => {
  it('evaluates policy decisions with a valid input', () => {
    const result = simulatePolicyDecision(Profiles.balanced, {
      subjectTenantId: 't1',
      resourceTenantId: 't1',
      action: 'read',
    });

    expect(typeof result.allow).toBe('boolean');
    expect(result.reason).toBeDefined();
  });
});
