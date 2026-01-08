
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { BundleManifest } from '../../server/src/policy/bundle/types';
import { collectBundleFiles, POLICY_DIR, DIST_DIR, LOCK_FILE } from './policy_bundle_utils';

const PRIVATE_KEY_PATH = 'keys/policy-signing-key.pem';
const PUBLIC_KEY_PATH = 'keys/policy-public-key.pem';

async function main() {
  console.log('Building policy bundle...');

  // Ensure dist directories exist
  await fs.mkdir(path.join(DIST_DIR, 'policies'), { recursive: true });
  await fs.mkdir(path.join(DIST_DIR, 'schemas'), { recursive: true });
  await fs.mkdir(path.join(DIST_DIR, 'test-vectors'), { recursive: true });
  await fs.mkdir(path.join(DIST_DIR, 'hashes'), { recursive: true });
  await fs.mkdir(path.join(DIST_DIR, 'signatures'), { recursive: true });

  const { files: bundleFiles, contentHash } = await collectBundleFiles(POLICY_DIR);

  for (const file of bundleFiles) {
    const destPath = path.join(DIST_DIR, file.path);
    // Create dest dir if needed
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    // Copy file
    await fs.copyFile(file.sourcePath, destPath);
  }

  // Create Bundle Manifest
  const isDeterministic = process.env.DETERMINISTIC_BUILD === 'true';
  const gitSha = process.env.GITHUB_SHA || 'dev';
  const timestamp = isDeterministic ? '2024-01-01T00:00:00.000Z' : new Date().toISOString();

  const manifest: BundleManifest = {
    bundle_id: isDeterministic ? `policy-${gitSha}` : `policy-${gitSha}-${Date.now()}`,
    evaluator_version: '1.0.0',
    created_from: gitSha,
    created_at: timestamp,
    files: bundleFiles.map(f => ({
        path: f.path,
        size: f.size,
        sha256: f.sha256
    })),
    signing_metadata: {
      algorithm: 'RSA-SHA256',
      key_id: 'dev-key-1',
      canonicalization: 'json-canonicalize',
    }
  };

  // Write bundle.json (Canonical JSON)
  const manifestContent = JSON.stringify(manifest, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((sorted, key) => {
        sorted[key] = value[key];
        return sorted;
      }, {} as any);
    }
    return value;
  }, 2);

  const bundleJsonPath = path.join(DIST_DIR, 'bundle.json');
  await fs.writeFile(bundleJsonPath, manifestContent);
  console.log(`Wrote bundle manifest to ${bundleJsonPath}`);

  // Calculate Checksums
  const bundleHash = crypto.createHash('sha256').update(manifestContent).digest('hex');
  await fs.writeFile(path.join(DIST_DIR, 'hashes', 'checksums.sha256'), `${bundleHash}  bundle.json\n`);

  // Sign the bundle hash
  if (await fs.stat(PRIVATE_KEY_PATH).catch(() => false)) {
    const privateKey = await fs.readFile(PRIVATE_KEY_PATH, 'utf8');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(manifestContent);
    const signature = signer.sign(privateKey, 'hex');
    await fs.writeFile(path.join(DIST_DIR, 'signatures', 'bundle.sig'), signature);
    console.log('Signed bundle manifest.');

    // Copy public key for verification
    if (await fs.stat(PUBLIC_KEY_PATH).catch(() => false)) {
        await fs.copyFile(PUBLIC_KEY_PATH, path.join(DIST_DIR, 'signatures', 'public-key.pem'));
    }
  } else {
    console.warn('No private key found, skipping signature.');
  }

  // Update lock file
  await fs.writeFile(LOCK_FILE, contentHash);
  console.log(`Updated ${LOCK_FILE} with content hash: ${contentHash}`);

  console.log('Policy bundle build complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
