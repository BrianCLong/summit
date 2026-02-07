import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateEvidenceBundle } from '../../evidence-generator.js';

const loadJson = async (filePath) => {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

test('generateEvidenceBundle emits required evidence IDs', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'evidence-bundle-test-'));
  const outputPath = path.join(dir, 'bundle.json');
  const policyPath = path.resolve('governance/policy-mapping-registry.yml');
  const preflightPath = path.join(dir, 'preflight.json');

  await writeFile(preflightPath, JSON.stringify({ allow: true, failures: [] }));

  await generateEvidenceBundle({
    outputPath,
    policyPath,
    preflightPath,
    provenancePath: path.join(dir, 'provenance.json'),
  });

  const bundle = await loadJson(outputPath);
  const ids = new Set(bundle.evidence.map((entry) => entry.id));

  ['EV-001', 'EV-002', 'EV-003', 'EV-004'].forEach((id) => {
    assert.ok(ids.has(id));
  });
});
