import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
  });
});
