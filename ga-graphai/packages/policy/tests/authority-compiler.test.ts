import { describe, expect, it } from 'vitest';
import {
  AuthorityLicenseCompiler,
  type GuardAuditRecord,
} from '../src/authority-compiler.ts';

const yamlBundle = `
version: "2024.11"
source: "unit-test"
licenses:
  allow: ["MIT", "Apache-2.0"]
  deny: ["GPL-3.0"]
policies:
  - id: allow-analytics-read
    effect: allow
    selectors:
      actions: ["report:read", "report:read"]
      resources: ["analytics", "analytics"]
      authorities: ["analyst", "analyst"]
      licenses: ["MIT"]
    obligations:
      - type: emit-audit
      - type: record-provenance
    reason: allow analysts to read analytics
  - id: deny-gpl-artifacts
    effect: allow
    selectors:
      actions: ["artifact:deploy"]
      resources: ["artifact"]
      licenses: ["GPL-3.0"]
    reason: block GPL payloads
`;

describe('AuthorityLicenseCompiler', () => {
  it('compiles YAML bundles into OPA guards with minimized selectors', () => {
    const compiler = new AuthorityLicenseCompiler({ defaultPackage: 'graph.guard' });
    const result = compiler.compileFromYaml(yamlBundle);

    expect(result.guards).toHaveLength(2);
    const allowGuard = result.guards[0];
    expect(allowGuard.selector.actions).toEqual(['report:read']);
    expect(allowGuard.selector.resources).toEqual(['analytics']);
    expect(allowGuard.selector.authorities).toEqual(['analyst']);
    expect(allowGuard.package).toBe('graph.guard');
    expect(allowGuard.query).toContain('input.action');
    expect(allowGuard.effect).toBe('allow');

    const denyGuard = result.guards[1];
    expect(denyGuard.effect).toBe('deny');
    expect(denyGuard.licenseVerdicts.some((verdict) => verdict.status === 'deny')).toBe(
      true,
    );
    expect(denyGuard.reason).toBe('block GPL payloads');

    expect(result.summary.originalSelectors).toBe(11);
    expect(result.summary.minimizedSelectors).toBe(7);
    expect(result.summary.deniedLicenses).toContain('GPL-3.0');
    expect(result.auditTrail.some((entry) => entry.event === 'license-denied')).toBe(true);
  });

  it('emits audit entries through the sink while building selector expressions', () => {
    const sinkEntries: GuardAuditRecord[] = [];
    const compiler = new AuthorityLicenseCompiler({
      auditSink: (entry) => sinkEntries.push(entry),
    });

    const result = compiler.compile({
      package: 'opa.runtime',
      version: '1.0.0',
      policies: [
        {
          id: 'release-engineer-approval',
          effect: 'allow',
          selectors: {
            actions: ['deploy', 'deploy'],
            resources: ['artifact'],
            authorities: ['release-engineer'],
            licenses: ['Apache-2.0'],
          },
          obligations: [{ type: 'emit-audit' }],
          reason: 'require trusted deployers',
        },
      ],
    });

    expect(result.guards[0].query).toContain('input.resource');
    expect(result.summary.originalSelectors).toBe(4);
    expect(result.summary.minimizedSelectors).toBe(4);
    expect(sinkEntries.some((entry) => entry.event === 'compiled-guard')).toBe(true);
    expect(result.auditTrail.find((entry) => entry.event === 'completed')?.source).toBe(
      'opa.runtime',
    );
  });
});
