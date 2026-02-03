import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import crypto from 'node:crypto';
import { generateControlEvidenceIndex } from '../generate_control_evidence_index.mjs';
import { validateControlEvidence } from '../validate_control_evidence.mjs';

async function writeFile(filePath, content) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, content);
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

test('generate control evidence index with checksums', async () => {
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'control-evidence-'));
  const evidenceDir = path.join(tempDir, 'dist', 'evidence', 'test');
  const artifactPath = path.join(evidenceDir, 'ci', 'sample.json');
  const artifactContent = JSON.stringify({ ok: true }, null, 2);
  await writeFile(artifactPath, artifactContent);

  const controlMapPath = path.join(tempDir, 'control-map.yaml');
  const exceptionsPath = path.join(tempDir, 'control-exceptions.yml');
  const mapContent = [
    'framework: SOC-style',
    'version: "1.0"',
    'controls:',
    '  CC1.1:',
    '    description: "Sample control"',
    '    evidence:',
    '      - "ci/sample"',
    '    status: covered',
    ''
  ].join('\n');
  await writeFile(controlMapPath, mapContent);
  await writeFile(exceptionsPath, '# none\n');

  const outPath = await generateControlEvidenceIndex({
    evidenceDir,
    controlMapPath,
    exceptionsPath
  });
  const raw = await fsp.readFile(outPath, 'utf8');
  const index = JSON.parse(raw);

  assert.equal(index.controls.length, 1);
  const evidence = index.controls[0].evidence[0];
  assert.equal(evidence.artifact_path, 'ci/sample.json');
  assert.equal(evidence.checksums.sha256, sha256(artifactContent));
});

test('validate control evidence detects missing artifacts', async () => {
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'control-evidence-'));
  const evidenceDir = path.join(tempDir, 'dist', 'evidence', 'test');
  const controlMapPath = path.join(tempDir, 'control-map.yaml');
  const exceptionsPath = path.join(tempDir, 'control-exceptions.yml');
  const mapContent = [
    'framework: SOC-style',
    'version: "1.0"',
    'controls:',
    '  CC1.1:',
    '    description: "Sample control"',
    '    evidence:',
    '      - "ci/sample"',
    '    status: covered',
    ''
  ].join('\n');
  await writeFile(controlMapPath, mapContent);
  await writeFile(exceptionsPath, '# none\n');

  await generateControlEvidenceIndex({
    evidenceDir,
    controlMapPath,
    exceptionsPath
  });

  const report = await validateControlEvidence({ evidenceDir, controlMapPath });
  assert.equal(report.status, 'fail');
  assert.ok(report.violations.some((item) => item.type === 'missing_bundle_artifact'));
});
