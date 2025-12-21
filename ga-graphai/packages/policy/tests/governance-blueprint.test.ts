import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  CiPolicyGateEngine,
  ControlCatalog,
  DataClassificationEnforcer,
  ExceptionRegistry,
  EvidencePackGenerator,
  RetentionDeletionEngine,
} from '../src/index.ts';

describe('Governance blueprint implementations', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    tempDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
    tempDirs.length = 0;
  });

  it('loads and validates control catalog coverage', () => {
    const dir = mkdtempSync('/tmp/catalog-');
    tempDirs.push(dir);
    const yaml = `
- id: POL-SEC-PII-001
  policy: pii-not-logged
  control_type: preventive
  enforcement: ["CI: secrets scanner", "Runtime: log redaction middleware"]
  evidence: ["ci-artifact", "log-scrubber-metrics"]
  owner: security
  review_cadence: quarterly
  status: enforced
- id: LEG-DATA-RET-010
  policy: delete-within-30-days
  control_type: detective
  enforcement: []
  evidence: []
  owner: data
  review_cadence: monthly
  status: gap
`;
    const file = path.join(dir, 'control-catalog.yaml');
    writeFileSync(file, yaml);

    const catalog = ControlCatalog.fromFile(file);
    const coverage = catalog.coverage(['pii-not-logged', 'delete-within-30-days']);
    expect(coverage.totalControls).toBe(2);
    expect(coverage.gaps).toHaveLength(1);
    const remediation = catalog.resolvePolicyGaps('delete-within-30-days', {
      enforcement: ['Deletion engine jobs'],
      evidence: ['signed attestation'],
    });
    expect(remediation.status).toBe('enforced');
  });

  it('promotes expired exceptions to incidents', () => {
    const registry = new ExceptionRegistry();
    registry.add({
      id: 'exp-1',
      policyId: 'pii-not-logged',
      owner: 'security',
      rationale: 'temporary log visibility',
      expiry: new Date(Date.now() - 1000),
      compensatingControls: ['scrubber'],
    });
    const incidents = registry.enforceExpiry(new Date());
    expect(incidents).toHaveLength(1);
    expect(registry.getIncidents()[0].sourceException).toBe('exp-1');
    expect(registry.list()[0].status).toBe('expired');
  });

  it('blocks CI when required gates fail', () => {
    const engine = new CiPolicyGateEngine();
    const result = engine.evaluate([
      { name: 'sbom', status: 'pass', severity: 'medium' },
      { name: 'license', status: 'pass', severity: 'low' },
      { name: 'secrets', status: 'fail', severity: 'critical', details: 'secret found' },
      { name: 'piiLogging', status: 'pass', severity: 'info' },
      { name: 'sast', status: 'pass', severity: 'info' },
      { name: 'dast', status: 'pass', severity: 'info' },
      { name: 'dependencyHealth', status: 'pass', severity: 'info' },
    ]);
    expect(result.passed).toBe(false);
    expect(result.failures.some((failure) => failure.name === 'secrets')).toBe(true);
  });

  it('enforces data classification with defaults', () => {
    const enforcer = new DataClassificationEnforcer();
    const result = enforcer.validate({
      id: 'asset-1',
      name: 'analytics events',
      classification: 'restricted',
      retentionDays: 120,
      encrypted: true,
      redactionEnabled: false,
      tags: [],
      purpose: 'analytics',
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'retentionDays')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'redactionEnabled')).toBe(true);
  });

  it('builds reproducible evidence packs and verifies payloads', () => {
    const dir = mkdtempSync('/tmp/evidence-');
    tempDirs.push(dir);
    const logPath = path.join(dir, 'logs', 'app.log');
    const configPath = path.join(dir, 'config', 'app.yaml');
    writeFileSync(logPath, 'log-entry');
    writeFileSync(configPath, 'config: value');
    const generator = new EvidencePackGenerator(dir);
    const pack = generator.generate([
      { type: 'file', path: logPath },
      { type: 'file', path: configPath },
      { type: 'inline', name: 'access-review.json', content: '{"owner":"security"}' },
    ]);

    const unpacked = EvidencePackGenerator.unpack(pack.pack);
    expect(unpacked.manifest).toHaveLength(3);
    expect(unpacked.payload['logs/app.log'].toString()).toBe('log-entry');
  });

  it('executes retention deletions with attestations', async () => {
    const engine = new RetentionDeletionEngine('secret');
    engine.registerPolicy({ id: 'ret-30', subjectType: 'tenant', retentionDays: 30 });
    let deleted = false;
    const job = engine.scheduleDeletion('ret-30', 'tenant-1', new Date(Date.now() - 1000), () => {
      deleted = true;
    });
    const run = await engine.executeDue(new Date());
    expect(deleted).toBe(true);
    expect(run.attestations).toHaveLength(1);
    expect(engine.verifyAttestation(job, run.attestations[0])).toBe(true);
  });
});
