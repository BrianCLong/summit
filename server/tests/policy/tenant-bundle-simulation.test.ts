import { describe, expect, it } from '@jest/globals';
import {
  PolicySimulationInput,
  simulatePolicyDecision,
  tenantPolicyBundleSchema,
} from '../../src/policy/tenantBundle';

const baseBundle = {
  tenantId: 'tenant-alpha',
  bundleId: 'bundle-1',
  metadata: {
    issuedAt: '2024-01-01T00:00:00Z',
    source: 'unit-test',
  },
  baseProfile: {
    id: 'base-tenant-profile',
    version: '1.0.0',
    regoPackage: 'intelgraph.authz',
    entrypoints: ['intelgraph/authz/allow'],
    guardrails: {
      defaultDeny: true,
      requirePurpose: true,
      requireJustification: false,
    },
    crossTenant: {
      mode: 'deny',
      allow: [],
      requireAgreements: true,
    },
    rules: [
      {
        id: 'allow-read-own-tenant',
        description: 'Allow read within tenant boundary',
        effect: 'allow',
        priority: 10,
        conditions: {
          actions: ['read'],
          resourceTenants: ['tenant-alpha'],
          subjectTenants: ['tenant-alpha'],
        },
      },
      {
        id: 'deny-cross-tenant',
        description: 'Deny cross-tenant actions by default',
        effect: 'deny',
        priority: 20,
        conditions: {
          actions: ['read', 'write'],
        },
      },
    ],
  },
  overlays: [],
};

describe('tenant policy bundle simulation', () => {
  it('denies cross-tenant access when no allowlist is configured', () => {
    const parsed = tenantPolicyBundleSchema.parse(baseBundle);
    const input: PolicySimulationInput = {
      subjectTenantId: 'tenant-alpha',
      resourceTenantId: 'tenant-beta',
      action: 'read',
      purpose: 'investigation',
    };

    const result = simulatePolicyDecision(parsed, input);
    expect(result.allow).toBe(false);
    expect(result.reason).toContain('cross-tenant');
    expect(result.overlaysApplied).toEqual([]);
  });

  it('applies higher-precedence overlay last to override allowlist posture', () => {
    const parsed = tenantPolicyBundleSchema.parse({
      ...baseBundle,
      overlays: [
        {
          id: 'default-cross-tenant-deny',
          precedence: 1,
          patches: [
            {
              op: 'set',
              path: '/crossTenant',
              value: {
                mode: 'deny',
                allow: [],
                requireAgreements: true,
              },
            },
          ],
        },
        {
          id: 'mission-exception',
          precedence: 100,
          selectors: { regions: ['eu-west-1'] },
          patches: [
            {
              op: 'set',
              path: '/tenantIsolation',
              value: {
                enabled: true,
                allowCrossTenant: true,
                actions: [],
              },
            },
            {
              op: 'set',
              path: '/crossTenant',
              value: {
                mode: 'allowlist',
                allow: ['tenant-beta'],
                requireAgreements: false,
              },
            },
            {
              op: 'append',
              path: '/rules',
              value: [
                {
                  id: 'allow-mission-cross-tenant',
                  description: 'Allow mission cross-tenant read to beta',
                  effect: 'allow',
                  priority: 30,
                  conditions: {
                    actions: ['read'],
                    resourceTenants: ['tenant-beta'],
                    subjectTenants: ['tenant-alpha'],
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const input: PolicySimulationInput = {
      subjectTenantId: 'tenant-alpha',
      resourceTenantId: 'tenant-beta',
      action: 'read',
      purpose: 'investigation',
    };

    const result = simulatePolicyDecision(parsed, input, {
      regions: ['eu-west-1'],
      environment: 'prod',
    });

    expect(result.overlaysApplied).toEqual([
      'default-cross-tenant-deny',
      'mission-exception',
    ]);
    expect(result.allow).toBe(true);
    expect(result.reason).toContain('mission cross-tenant');
  });
});
