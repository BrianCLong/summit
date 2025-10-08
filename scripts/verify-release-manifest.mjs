#!/usr/bin/env node
/**
 * verify-release-manifest.mjs
 *
 * Verifies release manifest integrity by checking:
 * - File hashes against manifest entries
 * - Current checkout commit vs. manifest commit
 * - Optional strict enforcement of tag commit matching
 *
 * Usage Examples:
 * Non-gating (warn only):
 *   node scripts/verify-release-manifest.mjs --tag=v2025.10.07
 *
 * Gate on exact tag checkout:
 *   node scripts/verify-release-manifest.mjs --tag=v2025.10.07 --strict
 *
 * Assert a specific manifest commit (e.g., from CI env):
 *   node scripts/verify-release-manifest.mjs --tag=v2025.10.07 --expect-sha=$GITHUB_SHA
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

// Parse command-line arguments
const argv = process.argv.slice(2);
const tag = argv.find(a => a.startsWith('--tag='))?.split('=')[1];
const strict = argv.includes('--strict');                 // require HEAD === tag commit
const expectSha = argv.find(a => a.startsWith('--expect-sha='))?.split('=')[1];

const DIST_DIR = resolve(process.cwd(), 'dist');
const MANIFEST_PATH = join(DIST_DIR, 'release-manifest.json');

// Check if manifest exists
if (!existsSync(MANIFEST_PATH)) {
  console.error(`❌ Manifest not found at ${MANIFEST_PATH}`);
  process.exit(1);
}

// Load manifest
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const manifestFiles = manifest.files || [];

if (!manifestFiles.length) {
  console.warn(`⚠️  No files listed in manifest`);
}

// Verify file hashes
let hashErrors = 0;
for (const entry of manifestFiles) {
  const filePath = join(DIST_DIR, entry.path);
  if (!existsSync(filePath)) {
    console.error(`❌ File missing: ${entry.path}`);
    hashErrors++;
    continue;
  }

  const content = readFileSync(filePath);
  const hash = createHash('sha256').update(content).digest('hex');
  
  if (hash !== entry.sha256) {
    console.error(`❌ Hash mismatch for ${entry.path}:`);
    console.error(`   Expected: ${entry.sha256}`);
    console.error(`   Got:      ${hash}`);
    hashErrors++;
  } else {
    console.log(`✓ ${entry.path}`);
  }
}

if (hashErrors > 0) {
  console.error(`\n❌ ${hashErrors} file(s) failed hash verification`);
  process.exit(1);
}

console.log(`\n✅ All ${manifestFiles.length} file(s) verified`);

// Resolve commits
const currentSha = execSync('git rev-parse HEAD', {encoding:'utf8'}).trim();
const tagSha = tag ? execSync(`git rev-parse ${tag}^{commit}`, {encoding:'utf8'}).trim() : null;
const manifestSha = manifest.commit || manifest.git?.commit || null;

// Optional assert against an explicitly expected SHA
if (expectSha && manifestSha && manifestSha !== expectSha) {
  console.error(`❌ Manifest commit does not match --expect-sha:
  Manifest: ${manifestSha}
  Expected: ${expectSha}`);
  process.exit(2);
}

// Report mismatch info (non-fatal by default)
if (manifestSha && currentSha !== manifestSha) {
  console.warn(`⚠️  Commit SHA mismatch:
  Manifest: ${manifestSha}
  Current:  ${currentSha}`);
}

// Strict mode: require current checkout to be exactly the tag commit
if (strict && tagSha && currentSha !== tagSha) {
  console.error(`❌ --strict: HEAD is not at the tag commit.
  Tag ${tag} -> ${tagSha}
  HEAD      -> ${currentSha}`);
  process.exit(3);
}

console.log(tagSha && currentSha === tagSha
  ? `🔒 Verified at tag ${tag} (${tagSha})`
  : tag
    ? `ℹ️  Verified manifest for ${tag}; HEAD is different (use --strict to enforce).`
    : `ℹ️  Verified manifest (no tag provided).`);
