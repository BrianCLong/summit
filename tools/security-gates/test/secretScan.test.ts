import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { scanForSecrets } from '../src/secretScan.ts';
import type { SecretScanConfig } from '../src/types.ts';

test('detects high-risk secrets', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-scan-'));
  const secretFile = path.join(tmpDir, 'secret.txt');
  fs.writeFileSync(secretFile, 'AWS key: AKIA1234567890ABCD12');

  const config: SecretScanConfig = {
    paths: [tmpDir],
    excludedGlobs: []
  };

  const result = await scanForSecrets('/', config);
  assert.strictEqual(result.ok, false);
  assert.ok(result.details[0].includes('AKIA'));
});

test('returns clean when no secrets found', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-scan-'));
  fs.writeFileSync(path.join(tmpDir, 'clean.txt'), 'just metadata');

  const config: SecretScanConfig = {
    paths: [tmpDir],
    excludedGlobs: []
  };

  const result = await scanForSecrets('/', config);
  assert.strictEqual(result.ok, true);
});
