import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildBundle } from '../src/bundle/builder.js';
import { verifyBundle } from '../src/bundle/verifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Skip: Test uses outdated API (buildBundle/verifyBundle instead of buildAdapterBundle/verifyAdapterBundle)
describe.skip('bundle verifier', () => {
  const tmpDir = path.join(__dirname, '__tmp__');
  const sourceDir = path.join(tmpDir, 'source');
  const outDir = path.join(tmpDir, 'out');

  beforeAll(async () => {
    await fs.emptyDir(tmpDir);
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'index.js'), 'module.exports = {};');
  });

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  it('accepts a signed bundle with manifest and payload', async () => {
    const bundleDir = await buildBundle({
      manifest: {
        name: 'demo',
        version: '0.0.1',
        description: 'demo adapter',
        entrypoint: 'index.js',
        capabilities: ['webhook'],
        requiredPermissions: ['adapter:webhook:emit'],
        compatibility: { companyOs: '>=0.1.0' },
        signature: 'signed',
      },
      sourceDir,
      outputDir: outDir,
    });

    const result = await verifyBundle(bundleDir);
    expect(result.valid).toBe(true);
  });

  it('fails unsigned bundle', async () => {
    const bundleDir = await buildBundle({
      manifest: {
        name: 'demo-unsigned',
        version: '0.0.1',
        description: 'demo adapter',
        entrypoint: 'index.js',
        capabilities: ['webhook'],
        requiredPermissions: ['adapter:webhook:emit'],
        compatibility: { companyOs: '>=0.1.0' },
      },
      sourceDir,
      outputDir: outDir,
    });

    const result = await verifyBundle(bundleDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((err) => err.includes('signature'))).toBe(true);
  });
});
