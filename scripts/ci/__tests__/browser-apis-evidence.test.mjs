import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const evidenceDir = path.join(root, 'evidence/browser-apis');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateCompatEntry(entry) {
  assert.equal(typeof entry.api, 'string');
  assert.ok(['universal-ish', 'chromium-centric'].includes(entry.class));
  assert.equal(typeof entry.fallback_required, 'boolean');
}

test('browser-apis evidence artifacts contain required fields', () => {
  const report = loadJson(path.join(evidenceDir, 'report.json'));
  const metrics = loadJson(path.join(evidenceDir, 'metrics.json'));
  const stamp = loadJson(path.join(evidenceDir, 'stamp.json'));

  assert.equal(report.item.slug, 'browser-apis');
  assert.equal(Array.isArray(report.evidence_ids), true);
  assert.equal(report.evidence_ids.length >= 4, true);
  assert.equal(Array.isArray(report.compat_matrix), true);
  assert.equal(report.compat_matrix.length >= 10, true);
  report.compat_matrix.forEach(validateCompatEntry);

  assert.equal(Array.isArray(metrics.metrics), true);
  metrics.metrics.forEach((metric) => {
    assert.equal(typeof metric.name, 'string');
    assert.equal(typeof metric.value, 'number');
    assert.equal(typeof metric.unit, 'string');
  });

  assert.equal(typeof stamp.generated_by, 'string');
  assert.equal(typeof stamp.generated_at, 'string');
  assert.equal(typeof stamp.note, 'string');
});

test('deny-by-default fixture fails when chromium-only fallback metadata is missing', () => {
  const invalidCompatEntry = { api: 'Idle Detection', class: 'chromium-centric' };
  assert.throws(() => validateCompatEntry(invalidCompatEntry));
});
