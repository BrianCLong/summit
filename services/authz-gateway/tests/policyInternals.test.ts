import type { PolicyInput } from '../src/policy';
import { __testInternals, authorize } from '../src/policy';

describe('policy internals', () => {
  const {
    applyObligations,
    setNestedValue,
    claimSatisfied,
    resourceSatisfied,
  } = __testInternals;

  it('applies obligations and builds nested structures on demand', () => {
    const record = {
      subject: {
        profile: {
          name: 'Alice Smith',
          location: { city: 'Denver' },
        },
        id: '123',
      },
    };

    const obligations = {
      redact: ['subject.profile.location.city'],
      mask: { 'subject.profile.name': 'INITIALS' },
    };

    const effects = applyObligations(record, obligations);

    expect(effects['subject.profile.location.city']).toEqual({
      before: 'Denver',
      after: '[REDACTED]',
      effect: 'redact',
    });
    expect(effects['subject.profile.name']).toEqual({
      before: 'Alice Smith',
      after: 'AS',
      effect: 'mask',
    });
    expect(effects['subject.id']).toEqual({
      before: '123',
      after: '123',
      effect: 'allow',
    });

    const container: Record<string, unknown> = {};
    setNestedValue(container, 'subject.audit.traceId', 'trace-001');
    expect(container).toEqual({ subject: { audit: { traceId: 'trace-001' } } });
  });

  it('compares claims against resource values', () => {
    const baseInput: PolicyInput = {
      user: {
        sub: 'alice',
        tenantId: 'tenantA',
        roles: ['reader'],
        clearance: 'confidential',
        status: 'active',
      },
      resource: {
        path: '/protected/resource',
        tenantId: 'tenantA',
      },
      action: 'read',
      purpose: 'treatment',
      authority: 'hipaa',
    };

    expect(
      claimSatisfied('tenantId', { equalsResource: 'tenantId' }, baseInput),
    ).toBe(true);
    expect(
      claimSatisfied('tenantId', { notEqualsResource: 'tenantId' }, baseInput),
    ).toBe(false);
    expect(
      claimSatisfied(
        'status',
        { exists: true },
        { ...baseInput, user: { ...baseInput.user, status: undefined } },
      ),
    ).toBe(false);
    expect(
      claimSatisfied('status', { oneOf: ['active', 'suspended'] }, baseInput),
    ).toBe(true);
  });

  it('validates resource existence and equality conditions', () => {
    const baseInput: PolicyInput = {
      user: {
        sub: 'alice',
        tenantId: 'tenantA',
        roles: ['reader'],
        clearance: 'confidential',
        status: 'active',
      },
      resource: {
        path: '/protected/resource',
        tenantId: 'tenantA',
        sensitivity: 'phi',
      },
      action: 'read',
      purpose: 'treatment',
      authority: 'hipaa',
    };

    expect(
      resourceSatisfied('tenantId', { equals: 'tenantA' }, baseInput),
    ).toBe(true);
    expect(
      resourceSatisfied('tenantId', { equals: 'tenantB' }, baseInput),
    ).toBe(false);
    expect(
      resourceSatisfied('classification', { exists: true }, baseInput),
    ).toBe(false);
    expect(
      resourceSatisfied('classification', { equals: 'phi' }, baseInput),
    ).toBe(false);
  });

  it('evaluates purpose and authority rule branches explicitly', async () => {
    const compliantDecision = await authorize({
      user: {
        sub: 'alice',
        tenantId: 'tenantA',
        roles: ['reader'],
        clearance: 'confidential',
        status: 'active',
      },
      resource: {
        path: '/protected/resource',
        tenantId: 'tenantA',
      },
      action: 'read',
      purpose: 'treatment',
      authority: 'hipaa',
    });
    expect(compliantDecision.policyId).toBe('policy.tenant-allow');

    const missingAuthority = await authorize({
      user: {
        sub: 'alice',
        tenantId: 'tenantA',
        roles: ['reader'],
        clearance: 'confidential',
        status: 'active',
      },
      resource: {
        path: '/protected/resource',
        tenantId: 'tenantA',
      },
      action: 'read',
      purpose: 'treatment',
      authority: '',
    });
    expect(missingAuthority.policyId).toBe('policy.require-authority');

    const wrongPurpose = await authorize({
      user: {
        sub: 'alice',
        tenantId: 'tenantA',
        roles: ['reader'],
        clearance: 'confidential',
        status: 'active',
      },
      resource: {
        path: '/protected/resource',
        tenantId: 'tenantA',
      },
      action: 'read',
      purpose: 'marketing',
      authority: 'hipaa',
    });
    expect(wrongPurpose.allowed).toBe(false);
    expect(wrongPurpose.policyId).toBe('policy.default.deny');
  });
});
