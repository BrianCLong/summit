"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const authority_compiler_ts_1 = require("../src/authority-compiler.ts");
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
(0, vitest_1.describe)('AuthorityLicenseCompiler', () => {
    (0, vitest_1.it)('compiles YAML bundles into OPA guards with minimized selectors', () => {
        const compiler = new authority_compiler_ts_1.AuthorityLicenseCompiler({ defaultPackage: 'graph.guard' });
        const result = compiler.compileFromYaml(yamlBundle);
        (0, vitest_1.expect)(result.guards).toHaveLength(2);
        const allowGuard = result.guards[0];
        (0, vitest_1.expect)(allowGuard.selector.actions).toEqual(['report:read']);
        (0, vitest_1.expect)(allowGuard.selector.resources).toEqual(['analytics']);
        (0, vitest_1.expect)(allowGuard.selector.authorities).toEqual(['analyst']);
        (0, vitest_1.expect)(allowGuard.package).toBe('graph.guard');
        (0, vitest_1.expect)(allowGuard.query).toContain('input.action');
        (0, vitest_1.expect)(allowGuard.effect).toBe('allow');
        const denyGuard = result.guards[1];
        (0, vitest_1.expect)(denyGuard.effect).toBe('deny');
        (0, vitest_1.expect)(denyGuard.licenseVerdicts.some((verdict) => verdict.status === 'deny')).toBe(true);
        (0, vitest_1.expect)(denyGuard.reason).toBe('block GPL payloads');
        (0, vitest_1.expect)(result.summary.originalSelectors).toBe(11);
        (0, vitest_1.expect)(result.summary.minimizedSelectors).toBe(7);
        (0, vitest_1.expect)(result.summary.deniedLicenses).toContain('GPL-3.0');
        (0, vitest_1.expect)(result.auditTrail.some((entry) => entry.event === 'license-denied')).toBe(true);
    });
    (0, vitest_1.it)('emits audit entries through the sink while building selector expressions', () => {
        const sinkEntries = [];
        const compiler = new authority_compiler_ts_1.AuthorityLicenseCompiler({
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
        (0, vitest_1.expect)(result.guards[0].query).toContain('input.resource');
        (0, vitest_1.expect)(result.summary.originalSelectors).toBe(4);
        (0, vitest_1.expect)(result.summary.minimizedSelectors).toBe(4);
        (0, vitest_1.expect)(sinkEntries.some((entry) => entry.event === 'compiled-guard')).toBe(true);
        (0, vitest_1.expect)(result.auditTrail.find((entry) => entry.event === 'completed')?.source).toBe('opa.runtime');
    });
});
