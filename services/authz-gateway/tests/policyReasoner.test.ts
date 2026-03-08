import path from 'path';
import fs from 'fs';
import {
  authorize,
  dryRun,
  bundleChecksum,
  getPolicyBundle,
  type PolicyInput,
} from '../src/policy';
import { setFeatureOverrides } from '../src/config';
import { resetAuditLog } from '../src/audit';

const goldenCases = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'fixtures', 'golden-policy-cases.json'),
    'utf-8',
  ),
);

describe('policy reasoner', () => {
  beforeEach(() => {
    resetAuditLog();
  });

  it('evaluates golden policy fixtures', async () => {
    expect.assertions(goldenCases.length * 2);
    for (const testCase of goldenCases) {
      const decision = await authorize(testCase.input);
      expect(decision.allowed).toBe(testCase.expected.allowed);
      expect(decision.policyId).toBe(testCase.expected.policyId);
    }
  });

  it('produces stable deny reason snapshots', async () => {
    const denies = [] as string[];
    for (const testCase of goldenCases) {
      const decision = await authorize(testCase.input);
      if (!decision.allowed) {
        denies.push(`${decision.policyId}: ${decision.reason}`);
      }
    }
    expect(denies).toMatchSnapshot();
  });

  it('generates field level effects for dry-run', async () => {
    const treatmentRecord = {
      subject: {
        name: 'Alice Smith',
        ssn: '123-45-6789',
        birthDate: '1988-07-14',
        financialAccount: '99887766',
      },
    };
    const treatmentResult = await dryRun(
      {
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
          attributes: { needToKnow: 'reader' },
        },
        action: 'read',
        purpose: 'treatment',
        authority: 'hipaa',
      },
      treatmentRecord,
    );
    expect(treatmentResult.fields['subject.name']).toEqual({
      before: 'Alice Smith',
      after: 'AS',
      effect: 'mask',
    });
    expect(treatmentResult.fields['subject.birthDate']).toEqual({
      before: '1988-07-14',
      after: '1988',
      effect: 'mask',
    });
    expect(treatmentResult.fields['subject.financialAccount']).toEqual({
      before: '99887766',
      after: '[REDACTED]',
      effect: 'redact',
    });

    const overrideRecord = {
      subject: {
        name: 'Carol White',
        ssn: '111-22-3333',
        accountNumber: '9988776655443322',
        region: 'Northwest',
      },
    };
    const overrideResult = await dryRun(
      {
        user: {
          sub: 'carol',
          tenantId: 'tenantA',
          roles: ['compliance'],
          clearance: 'confidential',
          status: 'active',
        },
        resource: {
          path: '/protected/investigation',
          tenantId: 'tenantB',
        },
        action: 'read',
        purpose: 'investigation',
        authority: 'fraud-investigation',
      },
      overrideRecord,
    );
    expect(overrideResult.fields['subject.accountNumber']).toEqual({
      before: '9988776655443322',
      after: '************3322',
      effect: 'mask',
    });
    expect(overrideResult.fields['subject.region']).toEqual({
      before: 'Northwest',
      after: 'MASKED',
      effect: 'mask',
    });
    expect(overrideResult.fields['subject.ssn']).toEqual({
      before: '111-22-3333',
      after: '[REDACTED]',
      effect: 'redact',
    });
  });

  it('is resilient to missing or extra claims', async () => {
    const baseInput: PolicyInput = {
      user: {
        sub: 'alice',
        tenantId: 'tenantA',
        roles: ['reader'],
        clearance: 'confidential',
        status: 'active',
        extraClaim: 'value',
      },
      resource: {
        path: '/protected/resource',
        tenantId: 'tenantA',
      },
      action: 'read',
      purpose: 'treatment',
      authority: 'hipaa',
    };
    const variants = [
      baseInput,
      {
        ...baseInput,
        user: { ...baseInput.user, tenantId: undefined },
      } as PolicyInput,
      {
        ...baseInput,
        user: { ...baseInput.user, roles: undefined },
      } as PolicyInput,
      {
        ...baseInput,
        resource: { ...baseInput.resource, tenantId: undefined },
      } as PolicyInput,
      {
        ...baseInput,
        user: { ...baseInput.user, clearance: 'topsecret' },
      } as PolicyInput,
    ];
    for (const variant of variants) {
      const decision = await authorize(variant);
      expect(typeof decision.allowed).toBe('boolean');
    }
  });

  it('fails fast when the policy bundle drifts', () => {
    const checksum = bundleChecksum();
    expect(checksum).toBe(
      '1f1b71360a024c2f1f100103244a5b90509b65c79c64440bdee5e628897cf6f2',
    );
  });

  it('exposes bundle metadata for regression assertions', () => {
    const bundle = getPolicyBundle();
    expect(bundle.metadata.version).toBe('2024.11.15');
    expect(bundle.rules.length).toBeGreaterThan(0);
  });

  it('allows traffic when policy reasoner is disabled', async () => {
    setFeatureOverrides({ policyReasoner: false });
    const decision = await authorize({
      user: {
        sub: 'alice',
        tenantId: 'tenantA',
        roles: ['reader'],
        clearance: 'confidential',
        status: 'active',
      },
      resource: {
        path: '/protected/resource',
        tenantId: 'tenantB',
      },
      action: 'read',
      purpose: '',
      authority: '',
    });
    expect(decision.allowed).toBe(true);
    expect(decision.policyId).toBe('policy.disabled');
    setFeatureOverrides({ policyReasoner: true });
  });
});
