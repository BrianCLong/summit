import { readFileSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const script = 'scripts/vibe/validate.mjs';
const manifestPath = '.summit/vibe_stack.json';

test('vibe:validate passes with default manifest and emits artifacts', () => {
  const output = execFileSync('node', [script], { encoding: 'utf8' });
  assert.match(output, /passed/);

  const report = JSON.parse(
    readFileSync('artifacts/vibe-stack/report.json', 'utf8')
  );
  assert.equal(report.status, 'passed');
  assert.equal(report.errors.length, 0);
});

test('vibe:validate fails for unapproved tooling', () => {
  const original = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(original);
  manifest.allowlist.tools.push('unapproved-tool');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  let stderr = '';
  try {
    execFileSync('node', [script], { encoding: 'utf8', stdio: 'pipe' });
    assert.fail('Expected validator to fail');
  } catch (error) {
    stderr = String(error.stderr);
  } finally {
    writeFileSync(manifestPath, original, 'utf8');
  }

  assert.match(stderr, /failed/);

  const report = JSON.parse(
    readFileSync('artifacts/vibe-stack/report.json', 'utf8')
  );
  assert.equal(report.status, 'failed');
  assert.ok(report.errors.some((error) => error.includes('Unapproved tooling')));
});
