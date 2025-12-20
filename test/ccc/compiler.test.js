import { strict as assert } from 'node:assert';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { compilePolicy, parsePolicy, writeArtifacts } from '../../src/ccc/compiler.js';

const fixturePolicy = `
version: 1.0.0
clauses:
  - scope: data.read
    allow:
      - purpose: analytics
        lawful_basis: legitimate_interest
      - purpose: fraud
        lawful_basis: legal_obligation
    deny:
      - marketing
  - scope: data.write
    allow:
      - purpose: provisioning
        lawful_basis: contract
`;

test('compiles YAML policies into language shims', async () => {
  const parsed = parsePolicy(fixturePolicy);
  const compiled = compilePolicy(parsed);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-'));
  await writeArtifacts(tmpDir, compiled);

  const pythonPolicy = await fs.readFile(path.join(tmpDir, 'python/consent_guard/policy_data.py'), 'utf8');
  const jsIndex = await fs.readFile(path.join(tmpDir, 'js/index.js'), 'utf8');
  const goPolicy = await fs.readFile(path.join(tmpDir, 'go/consentguard/policy_data.go'), 'utf8');

  assert.ok(pythonPolicy.includes("'data.read'"));
  assert.ok(jsIndex.includes('export const POLICY ='));
  assert.ok(goPolicy.includes('package consentguard'));
});

test('renders deterministic guard implementations', async () => {
  const parsed = parsePolicy(fixturePolicy);
  const compiled = compilePolicy(parsed);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-expected-'));
  await writeArtifacts(tmpDir, { ...compiled, generatedAt: '2025-01-01T00:00:00.000Z' });

  const pythonGuard = await fs.readFile(path.join(tmpDir, 'python/consent_guard/guard.py'), 'utf8');
  const jsTypes = await fs.readFile(path.join(tmpDir, 'js/index.d.ts'), 'utf8');
  const goGuard = await fs.readFile(path.join(tmpDir, 'go/consentguard/guard.go'), 'utf8');

  assert.ok(pythonGuard.includes('class ConsentViolation'));
  assert.ok(jsTypes.includes('export declare function withConsent'));
  assert.ok(goGuard.includes('type Guard func'));
});
