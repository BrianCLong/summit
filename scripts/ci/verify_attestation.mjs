import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';

const options = {
  input: { type: 'string', default: 'attestation.json' },
};

async function hashFile(filepath) {
  return new Promise((resolve) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filepath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (e) => {
      console.warn(`Warning: Failed to hash ${filepath}: ${e.message}`);
      resolve(null);
    });
  });
}

try {
  const { values } = parseArgs({ options });
  const inputPath = values.input;

  if (!fs.existsSync(inputPath)) {
    console.error(`Attestation file not found: ${inputPath}`);
    process.exit(1);
  }

  const attestation = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const manifest = attestation.manifest;

  if (!manifest || !Array.isArray(manifest)) {
    console.error('Invalid attestation format: missing manifest');
    process.exit(1);
  }

  console.log(`Verifying ${manifest.length} files...`);

  let mismatchCount = 0;
  for (const entry of manifest) {
    if (!fs.existsSync(entry.path)) {
      console.error(`File missing: ${entry.path}`);
      mismatchCount++;
      continue;
    }

    const digest = await hashFile(entry.path);
    const actualDigest = `sha256:${digest}`;

    if (actualDigest !== entry.digest) {
      console.error(`Digest mismatch for ${entry.path}`);
      console.error(`  Expected: ${entry.digest}`);
      console.error(`  Actual:   ${actualDigest}`);
      mismatchCount++;
    }
  }

  // Re-verify manifest hash
  const manifestContent = manifest.map(m => `${m.digest}  ${m.path}`).join('\n');
  const actualManifestSha256 = createHash('sha256').update(manifestContent).digest('hex');

  if (actualManifestSha256 !== attestation.inputs.manifest_sha256) {
    console.error('Manifest SHA256 mismatch');
    console.error(`  Expected: ${attestation.inputs.manifest_sha256}`);
    console.error(`  Actual:   ${actualManifestSha256}`);
    mismatchCount++;
  }

  if (mismatchCount > 0) {
    console.error(`Verification failed with ${mismatchCount} errors.`);
    process.exit(1);
  }

  console.log('✅ Attestation verified successfully.');
} catch (error) {
  console.error('Error verifying attestation:', error);
  process.exit(1);
}
