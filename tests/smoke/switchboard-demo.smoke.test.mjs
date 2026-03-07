import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('switchboard demo smoke', () => {
  const run = spawnSync(
    'pnpm',
    ['demo:switchboard'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        CI: '1',
      },
    }
  );

  assert.equal(run.status, 0, `expected exit 0, got ${run.status}\n${run.stderr}`);

  const output = `${run.stdout}\n${run.stderr}`;
  const markers = ['REGISTRY PASS', 'POLICY DENY', 'POLICY ALLOW', 'RECEIPT WRITTEN'];
  const positions = markers.map((marker) => output.indexOf(marker));

  positions.forEach((position, index) => {
    assert.notEqual(position, -1, `missing marker: ${markers[index]}\nOutput:\n${output}`);
  });

  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(
      positions[index] > positions[index - 1],
      `markers out of order: ${markers[index - 1]} then ${markers[index]}\nOutput:\n${output}`
    );
  }
});
