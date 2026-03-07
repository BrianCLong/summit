import { rmSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const feature = 'foo';
const outDir = 'tmp-vibe-features';
const script = 'scripts/vibe/scaffold.mjs';

test('vibe:scaffold creates deterministic skeleton with flag off', () => {
  rmSync(outDir, { recursive: true, force: true });

  execFileSync('node', [script, '--feature', feature, '--outdir', outDir], {
    encoding: 'utf8'
  });

  const flag = readFileSync(`${outDir}/${feature}/flag.ts`, 'utf8');
  assert.match(flag, /ENABLED = false/);

  const evidence = readFileSync(`${outDir}/${feature}/evidence/README.md`, 'utf8');
  assert.match(evidence, /EVID-FOO-0001/);

  const report = JSON.parse(
    readFileSync('artifacts/vibe-stack/report.json', 'utf8')
  );
  assert.equal(report.status, 'passed');
  assert.equal(report.feature, feature);

  rmSync(outDir, { recursive: true, force: true });
});
