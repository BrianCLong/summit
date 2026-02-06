import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('verify-evidence script', () => {
  const scriptPath = '.github/scripts/verify-evidence.ts';

  it('accepts passing fixtures', () => {
    const rootDir = path.join(
      process.cwd(),
      'tests/fixtures/evidence/pass'
    );
    const result = spawnSync('pnpm', [
      'exec',
      'ts-node',
      '--esm',
      scriptPath,
      '--root',
      rootDir,
    ]);
    assert.equal(result.status, 0);
  });

  it('rejects timestamp keys outside stamp.json', () => {
    const rootDir = path.join(
      process.cwd(),
      'tests/fixtures/evidence/fail'
    );
    const result = spawnSync('pnpm', [
      'exec',
      'ts-node',
      '--esm',
      scriptPath,
      '--root',
      rootDir,
    ]);
    assert.notEqual(result.status, 0);
  });
});
