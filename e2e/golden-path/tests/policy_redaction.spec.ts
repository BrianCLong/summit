import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
  });
});
