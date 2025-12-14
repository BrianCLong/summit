#!/usr/bin/env node
/**
 * Lightweight guardrail to discourage direct cache usage outside the shared abstraction.
 * Scans staged files for new ioredis imports or ad-hoc in-memory caches.
 */

const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const path = require('path');

const allowPrefixes = ['packages/cache', 'pnpm-lock.yaml'];

function getStagedFiles() {
  try {
    const output = execSync('git diff --name-only --cached', { encoding: 'utf8' }).trim();
    return output ? output.split('\n') : [];
  } catch (error) {
    console.error('Failed to read staged files', error);
    return [];
  }
}

function isAllowed(file) {
  return allowPrefixes.some((prefix) => file.startsWith(prefix));
}

function scanFile(file) {
  if (!file.match(/\.(ts|js|tsx|jsx)$/)) return null;
  if (isAllowed(file)) return null;

  const content = readFileSync(file, 'utf8');
  const redisUsage = content.match(/from ['"]ioredis['"]/);
  const adHocCache = content.match(/new Map\(/);

  if (redisUsage || adHocCache) {
    return {
      file,
      redis: Boolean(redisUsage),
      map: Boolean(adHocCache),
    };
  }
  return null;
}

const stagedFiles = getStagedFiles();
const findings = stagedFiles
  .map(scanFile)
  .filter((entry) => entry !== null);

if (findings.length === 0) {
  console.log('cache-check: no direct Redis or Map cache usage detected in staged files.');
  process.exit(0);
}

console.error('cache-check: prefer the shared cache abstraction in new code.');
for (const finding of findings) {
  const reasons = [finding.redis && 'direct ioredis import', finding.map && 'ad-hoc Map cache']
    .filter(Boolean)
    .join(', ');
  console.error(` - ${finding.file} (${reasons})`);
}

process.exit(1);
