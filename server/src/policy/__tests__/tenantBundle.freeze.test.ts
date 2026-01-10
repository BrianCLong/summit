import { simulatePolicyDecision, type TenantPolicyBundle } from '../tenantBundle.js';

describe('tenant policy freeze windows', () => {
  const bundle: TenantPolicyBundle = {
    tenantId: 'tenant-1',
    baseProfile: {
      id: 'baseline',
      version: '1.0.0',
      regoPackage: 'tenant.baseline',
      entrypoints: ['allow'],
      guardrails: {
        defaultDeny: true,
        requirePurpose: false,
        requireJustification: false,
      },
      freezeWindows: [
        {
          id: 'freeze-ops',
          description: 'Change freeze window',
          startsAt: '2026-01-01T00:00:00Z',
          endsAt: '2026-01-02T00:00:00Z',
          privilegedActions: ['write', 'delete', 'ingest'],
          requireBreakGlass: true,
          requireReceipt: true,
        },
      ],
      crossTenant: {
        mode: 'deny',
        allow: [],
        requireAgreements: true,
      },
      rules: [
        {
          id: 'allow-write',
          effect: 'allow',
          priority: 10,
          conditions: {
            actions: ['write', 'read', 'delete', 'ingest'],
          },
        },
      ],
    },
    overlays: [],
    metadata: {
      issuedAt: '2026-01-01T00:00:00Z',
      source: 'test',
    },
  };

  it('blocks privileged operations during freeze without break-glass', () => {
    const result = simulatePolicyDecision(
      bundle,
      {
        subjectTenantId: 'tenant-1',
        resourceTenantId: 'tenant-1',
        action: 'write',
        timestamp: '2026-01-01T12:00:00Z',
      },
    );

    expect(result.allow).toBe(false);
    expect(result.reason).toContain('freeze window');
  });

  it('blocks freeze override without receipt', () => {
    const result = simulatePolicyDecision(
      bundle,
      {
        subjectTenantId: 'tenant-1',
        resourceTenantId: 'tenant-1',
        action: 'delete',
        breakGlass: true,
        timestamp: '2026-01-01T12:00:00Z',
      },
    );

    expect(result.allow).toBe(false);
    expect(result.reason).toContain('receipt');
  });

  it('allows privileged operations with break-glass receipt', () => {
    const result = simulatePolicyDecision(
      bundle,
      {
        subjectTenantId: 'tenant-1',
        resourceTenantId: 'tenant-1',
        action: 'ingest',
        breakGlass: true,
        breakGlassReceiptId: 'bg-123',
        timestamp: '2026-01-01T12:00:00Z',
      },
    );

    expect(result.allow).toBe(true);
  });

  it('allows privileged operations when freeze window does not require break-glass', () => {
    const relaxedBundle: TenantPolicyBundle = {
      ...bundle,
      baseProfile: {
        ...bundle.baseProfile,
        freezeWindows: [
          {
            ...bundle.baseProfile.freezeWindows[0],
            requireBreakGlass: false,
          },
        ],
      },
    };

    const result = simulatePolicyDecision(
      relaxedBundle,
      {
        subjectTenantId: 'tenant-1',
        resourceTenantId: 'tenant-1',
        action: 'write',
        timestamp: '2026-01-01T12:00:00Z',
      },
    );

    expect(result.allow).toBe(true);
  });

  it('allows non-privileged actions during freeze', () => {
    const result = simulatePolicyDecision(
      bundle,
      {
        subjectTenantId: 'tenant-1',
        resourceTenantId: 'tenant-1',
        action: 'read',
        timestamp: '2026-01-01T12:00:00Z',
      },
    );

    expect(result.allow).toBe(true);
  });
});
