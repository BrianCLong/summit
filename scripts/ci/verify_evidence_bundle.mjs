import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MANIFEST_ROOT = 'artifacts/evidence';

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--sha') {
      options.sha = args[i + 1];
      i += 1;
    } else if (arg === '--manifest') {
      options.manifest = args[i + 1];
      i += 1;
    }
  }
  return options;
}

function getGitSha() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return result.stdout?.trim() || 'unknown';
}

async function sha256File(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function validateManifestSchema(manifest, sha) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Manifest must be a JSON object.');
  }
  if (manifest.schema_version !== '1') {
    throw new Error('Manifest schema_version must be "1".');
  }
  if (manifest.sha !== sha) {
    throw new Error(`Manifest sha mismatch. Expected ${sha} but got ${manifest.sha}.`);
  }
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    throw new Error('Manifest entries must be a non-empty array.');
  }
}

async function main() {
  const options = parseArgs(process.argv);
  const sha = options.sha ?? process.env.GITHUB_SHA ?? getGitSha();
  const manifestPath = options.manifest ?? path.join(DEFAULT_MANIFEST_ROOT, sha, 'manifest.json');

  const manifestRaw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  validateManifestSchema(manifest, sha);

  const failures = [];
  for (const entry of manifest.entries) {
    if (!entry?.path || !entry?.sha256) {
      failures.push(`Manifest entry missing path or sha256 for ${entry?.id ?? 'unknown'}`);
      continue;
    }
    const absolutePath = path.resolve(entry.path);
    try {
      await fs.access(absolutePath);
    } catch {
      failures.push(`Evidence file missing: ${entry.path}`);
      continue;
    }
    const actual = await sha256File(absolutePath);
    if (actual !== entry.sha256) {
      failures.push(`Digest mismatch for ${entry.path}: expected ${entry.sha256} but got ${actual}`);
    }
  }

  if (failures.length > 0) {
    failures.forEach((failure) => console.error(failure));
    process.exit(1);
  }

  console.log(`Evidence manifest verified at ${manifestPath}`);
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exit(2);
});
