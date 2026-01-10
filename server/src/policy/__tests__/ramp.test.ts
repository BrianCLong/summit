import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  computeRampBucket,
  evaluateRampDecision,
  type RampConfig,
} from '../ramp.js';
import type { TenantPolicyBundle } from '../tenantBundle.js';

const basePolicyBundle = (tenantId: string, ramp: RampConfig): TenantPolicyBundle => ({
  tenantId,
  baseProfile: {
    id: 'test-profile',
    version: '1.0.0',
    regoPackage: 'intelgraph.policies.test',
    entrypoints: ['allow'],
    guardrails: {
      defaultDeny: true,
      requirePurpose: false,
      requireJustification: false,
    },
    crossTenant: {
      mode: 'deny',
      allow: [],
      requireAgreements: true,
    },
    ramp,
    rules: [
      {
        id: 'allow-read',
        effect: 'allow',
        conditions: { actions: ['read'] },
      },
    ],
  },
  overlays: [],
});

describe('ramp policy evaluation', () => {
  it('applies allow/deny percentages by tenant, action, and workflow', () => {
    const rampConfig: RampConfig = {
      enabled: true,
      defaultAllowPercentage: 60,
      salt: 'salt-1',
      rules: [
        {
          id: 'rtbf-start',
          action: 'START',
          workflow: 'rtbf_request',
          allowPercentage: 30,
        },
        {
          id: 'rtbf-export',
          action: 'EXPORT',
          workflow: 'rtbf_audit',
          allowPercentage: 80,
        },
      ],
    };

    const bundle = basePolicyBundle('tenant-a', rampConfig);

    const startDecision = evaluateRampDecision(bundle, {
      tenantId: 'tenant-a',
      action: 'START',
      workflow: 'rtbf_request',
      key: 'job-123',
    });

    const startBucket = computeRampBucket({
      tenantId: 'tenant-a',
      action: 'START',
      workflow: 'rtbf_request',
      key: 'job-123',
      salt: 'salt-1',
    });

    expect(startDecision.percentage).toBe(30);
    expect(startDecision.bucket).toBe(startBucket);
    expect(startDecision.allow).toBe(startBucket < startDecision.percentage);

    const exportDecision = evaluateRampDecision(bundle, {
      tenantId: 'tenant-a',
      action: 'EXPORT',
      workflow: 'rtbf_audit',
      key: 'export-456',
    });

    expect(exportDecision.percentage).toBe(80);
    expect(exportDecision.allow).toBe(
      exportDecision.bucket < exportDecision.percentage,
    );

    const cancelDecision = evaluateRampDecision(bundle, {
      tenantId: 'tenant-a',
      action: 'CANCEL',
      workflow: 'rtbf_request',
      key: 'job-789',
    });

    expect(cancelDecision.percentage).toBe(60);
    expect(cancelDecision.allow).toBe(
      cancelDecision.bucket < cancelDecision.percentage,
    );
  });
});
