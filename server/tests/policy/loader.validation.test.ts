import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { loadSignedPolicy } from '../../src/policy/loader';

describe('loadSignedPolicy validation', () => {
  const prev = process.env.ALLOW_UNSIGNED_POLICY;

  afterEach(() => {
    if (prev !== undefined) process.env.ALLOW_UNSIGNED_POLICY = prev;
    else delete process.env.ALLOW_UNSIGNED_POLICY;
  });

  it('computes digest for valid bundle when unsigned override enabled', async () => {
    process.env.ALLOW_UNSIGNED_POLICY = 'true';
    const bundlePath = path.join(tmpdir(), `bundle-${Date.now()}.tgz`);
    await fs.writeFile(bundlePath, 'policy-bytes');

    const result = await loadSignedPolicy(bundlePath);

    expect(result.ok).toBe(true);
    expect(result.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(result.bundlePath).toBe(bundlePath);
  });
});
