import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const options = {
  dir: '',
  requireAttestations: true,
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--dir') {
    options.dir = args[i + 1] ?? '';
    i += 1;
  } else if (arg === '--require-attestations') {
    const value = args[i + 1];
    if (value === 'false') {
      options.requireAttestations = false;
    }
    i += 1;
  } else if (arg === '--no-require-attestations') {
    options.requireAttestations = false;
  }
}

if (!options.dir) {
  console.error('Usage: node scripts/release/verify_release_assets.mjs --dir <release-dir> [--require-attestations]');
  process.exit(2);
}

const releaseDir = path.resolve(options.dir);
const manifestPath = path.join(releaseDir, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing manifest: ${manifestPath}`);
  process.exit(1);
}

function sha256ForFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}

function listSbomAssets(assets) {
  return assets.filter((asset) => asset.type === 'sbom');
}

function verifyManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let hasFailures = false;

  for (const asset of manifest.assets) {
    const assetPath = path.join(releaseDir, asset.path);
    if (!fs.existsSync(assetPath)) {
      console.error(`Missing asset: ${asset.path}`);
      hasFailures = true;
      continue;
    }
    const actualHash = sha256ForFile(assetPath);
    if (actualHash !== asset.sha256) {
      console.error(`Hash mismatch for ${asset.path}`);
      console.error(`Expected ${asset.sha256}, got ${actualHash}`);
      hasFailures = true;
    }
    const actualSize = fs.statSync(assetPath).size;
    if (actualSize !== asset.size) {
      console.error(`Size mismatch for ${asset.path}`);
      console.error(`Expected ${asset.size}, got ${actualSize}`);
      hasFailures = true;
    }
  }

  const manifestHashPath = path.join(releaseDir, 'manifest.sha256');
  if (fs.existsSync(manifestHashPath)) {
    const expectedHash = fs.readFileSync(manifestHashPath, 'utf8').split(' ')[0].trim();
    const actualHash = sha256ForFile(manifestPath);
    if (expectedHash && expectedHash !== actualHash) {
      console.error('manifest.sha256 does not match manifest.json');
      hasFailures = true;
    }
  }

  const sbomAssets = listSbomAssets(manifest.assets);
  for (const sbom of sbomAssets) {
    const sbomPath = path.join(releaseDir, sbom.path);
    try {
      JSON.parse(fs.readFileSync(sbomPath, 'utf8'));
    } catch (error) {
      console.error(`Invalid SBOM JSON: ${sbom.path}`);
      hasFailures = true;
    }
  }

  return { manifest, hasFailures };
}

function verifyEvidenceBundle() {
  const evidenceDir = path.join(releaseDir, 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    console.error('Evidence bundle not found.');
    return false;
  }

  const result = spawnSync('node', ['scripts/evidence/verify_evidence_bundle.mjs'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ARTIFACTS_DIR: releaseDir,
    },
    stdio: 'inherit',
  });

  return result.status === 0;
}

function verifyTagLink(manifest) {
  if (process.env.GITHUB_REF && process.env.GITHUB_SHA) {
    const tagRef = process.env.GITHUB_REF;
    if (tagRef.startsWith('refs/tags/')) {
      const tagName = tagRef.replace('refs/tags/', '');
      if (manifest.meta?.tag && manifest.meta.tag !== tagName) {
        console.error(`Manifest tag mismatch: ${manifest.meta.tag} vs ${tagName}`);
        return false;
      }
      if (manifest.meta?.gitSha && manifest.meta.gitSha !== process.env.GITHUB_SHA) {
        console.error(`Manifest SHA mismatch: ${manifest.meta.gitSha} vs ${process.env.GITHUB_SHA}`);
        return false;
      }
    }
  }
  return true;
}

function ghAvailable() {
  try {
    execFileSync('gh', ['--version'], { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function verifyAttestations(assets) {
  if (!options.requireAttestations) {
    console.log('Attestation verification disabled.');
    return true;
  }
  if (!process.env.GITHUB_REPOSITORY) {
    console.error('GITHUB_REPOSITORY not set. Cannot verify attestations.');
    return false;
  }
  if (!ghAvailable()) {
    console.error('GitHub CLI not available for attestation verification.');
    return false;
  }

  for (const asset of assets) {
    if (asset.type !== 'package') {
      continue;
    }
    const assetPath = path.join(releaseDir, asset.path);
    const result = spawnSync(
      'gh',
      ['attestation', 'verify', assetPath, '--repo', process.env.GITHUB_REPOSITORY],
      { stdio: 'inherit' },
    );
    if (result.status !== 0) {
      console.error(`Attestation verification failed for ${asset.path}`);
      return false;
    }
  }
  return true;
}

const { manifest, hasFailures } = verifyManifest();
const evidenceOk = verifyEvidenceBundle();
const tagOk = verifyTagLink(manifest);
const attestationOk = verifyAttestations(manifest.assets);

if (hasFailures || !evidenceOk || !tagOk || !attestationOk) {
  process.exit(1);
}

process.exit(0);
