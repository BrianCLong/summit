import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const SCRIPT_PATH = join(
  process.cwd(),
  'scripts',
  'release',
  'generate_artifact_inventory.mjs',
);

const sha256 = (content) => createHash('sha256').update(content).digest('hex');

describe('generate_artifact_inventory.mjs', () => {
  let tempDir;
  let artifactsDir;
  let outDir;

  before(() => {
    tempDir = mkdtempSync('artifact-inventory-test-');
    artifactsDir = join(tempDir, 'bundle');
    outDir = join(tempDir, 'inventory');
    mkdirSync(artifactsDir, { recursive: true });
    mkdirSync(join(artifactsDir, 'nested'), { recursive: true });

    writeFileSync(join(artifactsDir, 'alpha.txt'), 'alpha');
    writeFileSync(join(artifactsDir, 'nested', 'beta.json'), '{"ok":true}');
  });

  after(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('emits deterministic inventory and SHA256SUMS', () => {
    execFileSync('node', [
      SCRIPT_PATH,
      '--dir',
      artifactsDir,
      '--out',
      outDir,
    ]);

    const inventory = JSON.parse(
      readFileSync(join(outDir, 'inventory.json'), 'utf8'),
    );
    const sums = readFileSync(join(outDir, 'SHA256SUMS'), 'utf8').trim();

    assert.equal(inventory.build.commit_sha.length > 0, true);
    assert.equal(inventory.build.ref.length > 0, true);
    assert.equal(inventory.artifacts.length, 2);
    assert.deepEqual(
      inventory.artifacts.map((entry) => entry.path),
      ['alpha.txt', 'nested/beta.json'],
    );
    const [alphaEntry, betaEntry] = inventory.artifacts;
    assert.equal(alphaEntry.content_type, 'text/plain');
    assert.equal(betaEntry.content_type, 'application/json');

    const alphaHash = sha256('alpha');
    const betaHash = sha256('{"ok":true}');
    const expectedSums = `${alphaHash}  alpha.txt\n${betaHash}  nested/beta.json`;
    assert.equal(sums, expectedSums);
  });
});
