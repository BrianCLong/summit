import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadSignedPolicy } from '../../src/policy/loader';

describe('loadSignedPolicy strict validation', () => {
  const originalAllowUnsigned = process.env.ALLOW_UNSIGNED_POLICY;

  afterEach(() => {
    process.env.ALLOW_UNSIGNED_POLICY = originalAllowUnsigned;
  });

  it('rejects missing signature when unsigned not allowed', async () => {
    process.env.ALLOW_UNSIGNED_POLICY = 'false';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-bundle-'));
    const bundlePath = path.join(tempDir, 'bundle.tgz');
    fs.writeFileSync(bundlePath, 'bundle');

    await expect(loadSignedPolicy(bundlePath)).rejects.toBeTruthy();
  });

  it('rejects empty bundle even when unsigned is allowed', async () => {
    process.env.ALLOW_UNSIGNED_POLICY = 'true';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-bundle-'));
    const bundlePath = path.join(tempDir, 'bundle.tar');
    fs.writeFileSync(bundlePath, '');

    await expect(loadSignedPolicy(bundlePath)).rejects.toThrow('empty');
  });

  it('accepts valid unsigned bundle when override is set', async () => {
    process.env.ALLOW_UNSIGNED_POLICY = 'true';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-bundle-'));
    const bundlePath = path.join(tempDir, 'bundle.tar.gz');
    fs.writeFileSync(bundlePath, 'valid bundle');

    const result = await loadSignedPolicy(bundlePath);
    expect(result.ok).toBe(true);
    expect(result.signatureVerified).toBe(false);
    expect(result.digest).toBeDefined();
  });
});
