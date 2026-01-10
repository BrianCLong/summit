import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { promises as fs } from 'fs';
import path from 'path';
import { evaluateLabels, extractLabelNames, mapLabelToLevel, run } from '../../scripts/check-semver-label';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('maps semver labels to bump levels', () => {
  assert.equal(mapLabelToLevel('semver:patch'), 'patch');
  assert.equal(mapLabelToLevel('semver:minor'), 'minor');
  assert.equal(mapLabelToLevel('semver:major'), 'major');
  assert.equal(mapLabelToLevel('unknown'), null);
});

test('warns when no semver label is present', () => {
  const report = evaluateLabels(['bug', 'documentation']);
  assert.equal(report.status, 'warn');
  assert(report.warnings.includes('No semver label detected. Add one of semver:patch, semver:minor, semver:major.'));
  assert.equal(report.label, null);
});

test('fails in strict mode when no semver label is present', async () => {
  const { exitCode, report } = await run({ strict: true });
  assert.equal(report.status, 'warn');
  assert.equal(exitCode, 1);
});

test('fails when multiple semver labels are present', () => {
  const report = evaluateLabels(['semver:patch', 'semver:minor']);
  assert.equal(report.status, 'fail');
  assert(report.errors.includes('Multiple semver labels detected; use exactly one.'));
});

test('deduplicates repeated semver labels', () => {
  const report = evaluateLabels(['semver:patch', 'Semver:Patch']);
  assert.equal(report.status, 'pass');
  assert.equal(report.label, 'semver:patch');
  assert.equal(report.bump, 'patch');
});

test('loads labels from fixture mode', async () => {
  const fixture = { labels: [{ name: 'semver:minor' }, { name: 'needs-tests' }] };
  const tempPath = path.join(__dirname, 'fixture.json');
  await fs.writeFile(tempPath, JSON.stringify(fixture));

  const { report, exitCode } = await run({ fixturePath: tempPath });

  assert.equal(report.source, 'fixture');
  assert.equal(report.label, 'semver:minor');
  assert.equal(report.bump, 'minor');
  assert.equal(exitCode, 0);

  await fs.unlink(tempPath);
});

test('respects warn-only mode even on failures', async () => {
  const { exitCode, report } = await run({ warnOnly: true });
  assert.equal(report.status, 'warn');
  assert.equal(exitCode, 0);
});

test('extracts label names from multiple shapes', () => {
  assert.deepEqual(extractLabelNames(['a', 'b']), ['a', 'b']);
  assert.deepEqual(extractLabelNames({ labels: [{ name: 'c' }] }), ['c']);
  assert.deepEqual(extractLabelNames([{ name: 'd' }, { name: 'e' }]), ['d', 'e']);
});
