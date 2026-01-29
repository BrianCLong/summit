import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

<<<<<<< HEAD
test.describe('Policy Redaction Gate', () => {
  // Always enable this test, or ensure it runs when tests are enabled

  test('detects forbidden patterns in artifacts', async () => {
    // 1. Create a fake evidence dir with a secret
    const testDir = 'artifacts/evidence/test-redaction-fail';
    const secretFile = path.join(testDir, 'leak.json');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(secretFile, '{ "key": "SECRET=12345" }');

    // 2. Run scan script targeting this dir
    // We assume the script is at ../../../scripts/ci/redaction_scan.sh relative to tests, or just use root path if running from root.
    // Playwright runs from e2e/golden-path usually if invoked via npx playwright test.
    // But we need to invoke the script relative to repo root.
    const scriptPath = path.resolve('../../scripts/ci/redaction_scan.sh');

    try {
        execSync(`EVIDENCE_DIR=${testDir} ${scriptPath}`);
        expect(true, 'Script should have failed').toBe(false);
    } catch (error: any) {
        // execSync throws on non-zero exit code
        expect(error.status).not.toBe(0);
        expect(error.stdout.toString()).toContain('Forbidden pattern found');
    }

    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('passes on clean artifacts', async () => {
    // 1. Create a clean evidence dir
    const testDir = 'artifacts/evidence/test-redaction-pass';
    const cleanFile = path.join(testDir, 'clean.json');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(cleanFile, '{ "key": "value" }');

    // 2. Run scan script
    const scriptPath = path.resolve('../../scripts/ci/redaction_scan.sh');

    try {
        execSync(`EVIDENCE_DIR=${testDir} ${scriptPath}`);
    } catch (error: any) {
        expect(error.status).toBe(0);
    }

    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
=======
test.describe.configure({ mode: 'serial' });

test.describe('policy: redaction', () => {
  const artifactsDir = path.join(__dirname, '../../../artifacts/test-redaction');
  const scanScript = path.join(__dirname, '../../../scripts/ci/redaction_scan.sh');

  test.beforeAll(() => {
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
  });

  test.beforeEach(() => {
    // Clean directory before each test
    if (fs.existsSync(artifactsDir)) {
        fs.rmSync(artifactsDir, { recursive: true, force: true });
        fs.mkdirSync(artifactsDir, { recursive: true });
    }
  });

  test.afterAll(() => {
    if (fs.existsSync(artifactsDir)) {
      fs.rmSync(artifactsDir, { recursive: true, force: true });
    }
  });

  test('scanner allows clean artifacts', () => {
    fs.writeFileSync(path.join(artifactsDir, 'clean.txt'), 'This is a clean file.');

    try {
      execSync(`${scanScript} ${artifactsDir}`, { stdio: 'pipe' });
    } catch (e: any) {
      throw new Error(`Scanner failed on clean artifact: ${e.stdout?.toString()}`);
    }
  });

  test('scanner detects secrets', () => {
    fs.writeFileSync(path.join(artifactsDir, 'dirty.txt'), 'Config: SECRET=super_sensitive_value');

    try {
      execSync(`${scanScript} ${artifactsDir}`, { stdio: 'pipe' });
      throw new Error('Scanner should have failed but passed.');
    } catch (e: any) {
      expect(e.status).toBe(1);
      const output = e.stdout?.toString() + e.stderr?.toString();
      expect(output).toContain('Forbidden pattern found');
    }
>>>>>>> 50f8d7925a (feat: add golden path E2E test harness for consolidated frontend)
  });
});
