import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const GENERATE_SCRIPT = join(process.cwd(), 'scripts', 'release', 'generate_artifact_inventory.mjs');
const VERIFY_SCRIPT = join(process.cwd(), 'scripts', 'release', 'verify_artifact_inventory.mjs');

function runGenerate(dir) {
  execSync(`node ${GENERATE_SCRIPT} --dir ${dir} --output ${join(dir, 'release-artifacts')}`, {
    stdio: 'pipe'
  });
}

function runVerify(dir, expectFail = false) {
  try {
    execSync(`node ${VERIFY_SCRIPT} --dir ${dir}`, { stdio: 'pipe' });
    if (expectFail) {
      assert.fail('Expected verification to fail');
    }
  } catch (error) {
    if (!expectFail) {
      throw error;
    }
  }
}

describe('artifact inventory generation', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync('artifact-inventory-test-');
    mkdirSync(join(tempDir, 'subdir'), { recursive: true });
    writeFileSync(join(tempDir, 'alpha.txt'), 'alpha');
    writeFileSync(join(tempDir, 'subdir', 'beta.json'), '{"ok":true}');
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('produces deterministic inventory ordering', () => {
    runGenerate(tempDir);
    const inventoryFirst = readFileSync(join(tempDir, 'release-artifacts', 'inventory.json'), 'utf8');
    const sumsFirst = readFileSync(join(tempDir, 'release-artifacts', 'SHA256SUMS'), 'utf8');

    runGenerate(tempDir);
    const inventorySecond = readFileSync(join(tempDir, 'release-artifacts', 'inventory.json'), 'utf8');
    const sumsSecond = readFileSync(join(tempDir, 'release-artifacts', 'SHA256SUMS'), 'utf8');

    assert.equal(inventoryFirst, inventorySecond);
    assert.equal(sumsFirst, sumsSecond);
  });
});

describe('artifact inventory verification', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync('artifact-inventory-verify-');
    mkdirSync(join(tempDir, 'subdir'), { recursive: true });
    writeFileSync(join(tempDir, 'alpha.txt'), 'alpha');
    writeFileSync(join(tempDir, 'subdir', 'beta.json'), '{"ok":true}');
    runGenerate(tempDir);
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('detects tampered file', () => {
    writeFileSync(join(tempDir, 'alpha.txt'), 'tampered');
    runVerify(tempDir, true);
  });

  test('detects missing file', () => {
    unlinkSync(join(tempDir, 'alpha.txt'));
    runVerify(tempDir, true);
  });

  test('detects extra file', () => {
    writeFileSync(join(tempDir, 'gamma.txt'), 'extra');
    runVerify(tempDir, true);
  });

  test('detects invalid SHA256SUMS format', () => {
    writeFileSync(join(tempDir, 'release-artifacts', 'SHA256SUMS'), 'not-a-valid-line');
    runVerify(tempDir, true);
  });
});
