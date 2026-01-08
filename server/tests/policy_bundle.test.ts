
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { BundleLoader } from '../src/policy/bundle/loader';
import { BundleManifest } from '../src/policy/bundle/types';

const DIST_DIR = 'dist/policy-bundle';

test('Policy Bundle Verification', async (t) => {
  await t.test('loader should load and verify the bundle', async () => {
    // Ensure bundle exists (it should be built by previous steps)
    const loader = new BundleLoader(DIST_DIR);
    const bundle = await loader.load();

    assert.ok(bundle.verified, 'Bundle should be verified');
    assert.ok(bundle.manifest.files.length > 0, 'Bundle should have files');
    assert.strictEqual(bundle.manifest.signing_metadata.algorithm, 'RSA-SHA256');
  });

  await t.test('tampering with a file should fail verification', async () => {
    // Backup original file
    const manifestPath = path.join(DIST_DIR, 'bundle.json');
    const originalManifest = await fs.readFile(manifestPath, 'utf8');
    const manifest: BundleManifest = JSON.parse(originalManifest);
    const firstFile = manifest.files[0];
    const firstFilePath = path.join(DIST_DIR, firstFile.path);
    const originalContent = await fs.readFile(firstFilePath, 'utf8');

    // Tamper
    await fs.writeFile(firstFilePath, originalContent + 'TAMPERED');

    const loader = new BundleLoader(DIST_DIR);

    await assert.rejects(async () => {
      await loader.load();
    }, /Integrity check failed/, 'Loader should reject tampered file');

    // Restore
    await fs.writeFile(firstFilePath, originalContent);
  });

  await t.test('tampering with signature should fail verification', async () => {
    const sigPath = path.join(DIST_DIR, 'signatures', 'bundle.sig');
    const originalSig = await fs.readFile(sigPath, 'utf8');

    // Tamper signature
    await fs.writeFile(sigPath, 'invalid_signature_hex_data');

    const loader = new BundleLoader(DIST_DIR);

    await assert.rejects(async () => {
      await loader.load();
    }, /Bundle signature verification failed/, 'Loader should reject invalid signature');

    // Restore
    await fs.writeFile(sigPath, originalSig);
  });
});
