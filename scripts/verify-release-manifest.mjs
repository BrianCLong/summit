#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Parse command-line arguments
const argv = process.argv.slice(2);
const tag = argv.find(a => a.startsWith('--tag='))?.split('=')[1];
const strict = argv.includes('--strict');
const expectSha = argv.find(a => a.startsWith('--expect-sha='))?.split('=')[1];

if (!tag) {
  console.error('Usage: node verify-release-manifest.mjs --tag=TAG [--strict] [--expect-sha=SHA]');
  process.exit(1);
}

// Get current HEAD SHA
const currentSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

// Get tag SHA
const tagSha = execSync(`git rev-list -n 1 ${tag}`, { encoding: 'utf8' }).trim();

// Try to read manifest file (e.g., release-manifest.json)
let manifestSha = null;
const manifestPath = resolve('release-manifest.json');
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifestSha = manifest.commit || manifest.sha;
  } catch (err) {
    console.warn('⚠️  Could not parse release manifest:', err.message);
  }
}

// Verify against expected SHA
if (expectSha && manifestSha && manifestSha !== expectSha) {
  console.error(`❌ Manifest commit does not match --expect-sha:\n  Manifest: ${manifestSha}\n  Expected: ${expectSha}`);
  process.exit(2);
}

// Check if manifest SHA matches current SHA
if (manifestSha && currentSha !== manifestSha) {
  console.warn(`⚠️  Commit SHA mismatch:\n  Manifest: ${manifestSha}\n  Current:  ${currentSha}`);
}

// Strict mode: HEAD must be at the tag commit
if (strict && tagSha && currentSha !== tagSha) {
  console.error(`❌ --strict: HEAD is not at the tag commit.\n  Tag ${tag} -> ${tagSha}\n  HEAD      -> ${currentSha}`);
  process.exit(3);
}

// Success output
if (tagSha && currentSha === tagSha) {
  console.log(`🔒 Verified at tag ${tag} (${tagSha})`);
} else if (tag) {
  console.log(`ℹ️  Verified manifest for ${tag}; HEAD is different (use --strict to enforce).`);
} else {
  console.log(`ℹ️  Verified manifest (no tag provided).`);
}

process. Exit(0);
