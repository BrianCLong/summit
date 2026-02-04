import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const TEST_ROOT = 'tmp-test/sigstore-version-guard';
const REPORT_PATH = path.join(TEST_ROOT, 'artifacts/supply-chain/sigstore/version_report.json');
const SCRIPT_PATH = path.resolve('scripts/security/check_sigstore_versions.ts');

function setupDir() {
  if (fs.existsSync(TEST_ROOT)) {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_ROOT, { recursive: true });
}

function writeFile(relativePath: string, content: string) {
  const fullPath = path.join(TEST_ROOT, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function runGuard() {
  return execSync(`npx tsx ${SCRIPT_PATH} --root ${TEST_ROOT} --report ${REPORT_PATH}`, {
    stdio: 'pipe',
  });
}

test('passes when sigstore versions meet minimums', () => {
  setupDir();
  writeFile(
    'go.mod',
    `module example.com/test\n\ngo 1.22\n\nrequire github.com/sigstore/sigstore v1.10.4\n`,
  );
  writeFile(
    'requirements.txt',
    'sigstore==4.2.0\n',
  );

  runGuard();

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  assert.strictEqual(report.status, 'pass');
  assert.strictEqual(report.violations.length, 0);
});

test('fails when vulnerable sigstore versions are present', () => {
  setupDir();
  writeFile(
    'go.mod',
    `module example.com/test\n\ngo 1.22\n\nrequire github.com/sigstore/sigstore v1.10.3\n`,
  );
  writeFile(
    'requirements.txt',
    'sigstore==4.1.9\n',
  );

  try {
    runGuard();
    assert.fail('Expected version guard to fail');
  } catch (error: any) {
    assert.strictEqual(error.status, 1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  assert.strictEqual(report.status, 'fail');
  assert.strictEqual(report.violations.length, 2);
});

