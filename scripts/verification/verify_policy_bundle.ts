
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { BundleManifest } from '../../server/src/policy/bundle/types';

const DIST_DIR = process.argv[2] || 'dist/policy-bundle';
const PUBLIC_KEY_PATH = path.join(DIST_DIR, 'signatures', 'public-key.pem');

async function verifyBundle() {
  console.log(`Verifying policy bundle in ${DIST_DIR}...`);

  // 1. Read bundle.json
  const bundleJsonPath = path.join(DIST_DIR, 'bundle.json');
  const bundleContent = await fs.readFile(bundleJsonPath, 'utf8');
  const manifest: BundleManifest = JSON.parse(bundleContent);

  // 2. Verify Schema (Basic check)
  if (!manifest.bundle_id || !manifest.files) {
    throw new Error('Invalid bundle manifest schema');
  }

  // 3. Verify Checksums
  const checksumsPath = path.join(DIST_DIR, 'hashes', 'checksums.sha256');
  const checksumsContent = await fs.readFile(checksumsPath, 'utf8');
  const [expectedHash] = checksumsContent.trim().split(/\s+/);

  const actualHash = crypto.createHash('sha256').update(bundleContent).digest('hex');
  if (actualHash !== expectedHash) {
    throw new Error(`Bundle manifest hash mismatch. Expected ${expectedHash}, got ${actualHash}`);
  }
  console.log('Bundle manifest checksum verified.');

  // 4. Verify Signature
  if (await fs.stat(PUBLIC_KEY_PATH).catch(() => false)) {
    const publicKey = await fs.readFile(PUBLIC_KEY_PATH, 'utf8');
    const signaturePath = path.join(DIST_DIR, 'signatures', 'bundle.sig');
    const signature = await fs.readFile(signaturePath, 'utf8');

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(bundleContent);
    const valid = verifier.verify(publicKey, signature, 'hex');

    if (!valid) {
      throw new Error('Invalid bundle signature');
    }
    console.log('Bundle signature verified.');
  } else {
    console.warn('Public key not found in bundle, skipping signature verification.');
  }

  // 5. Verify individual files
  for (const file of manifest.files) {
    // FIX: The path in manifest is relative to bundle root (e.g. "policies/foo.rego" or "schemas/bar.json")
    // We must join with DIST_DIR, not DIST_DIR/policies
    const filePath = path.join(DIST_DIR, file.path);
    const fileBuffer = await fs.readFile(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    if (fileHash !== file.sha256) {
      throw new Error(`File hash mismatch for ${file.path}. Expected ${file.sha256}, got ${fileHash}`);
    }

    if (fileBuffer.length !== file.size) {
        throw new Error(`File size mismatch for ${file.path}. Expected ${file.size}, got ${fileBuffer.length}`);
    }
  }
  console.log(`Verified ${manifest.files.length} policy files.`);

  console.log(JSON.stringify({
    status: 'verified',
    bundle_id: manifest.bundle_id,
    files_count: manifest.files.length,
    timestamp: new Date().toISOString()
  }, null, 2));
}

verifyBundle().catch((err) => {
  console.error(JSON.stringify({
    status: 'failed',
    error: err.message
  }, null, 2));
  process.exit(1);
});
