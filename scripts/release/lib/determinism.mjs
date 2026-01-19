/**
 * Determinism Enforcement Library
 *
 * Ensures all GA artifacts are:
 * - Content-addressed (hashes derived from repo content + pinned config)
 * - Environment-independent (no wall-clock time, no hostname, no transient state)
 * - Reproducible (same SHA produces byte-identical outputs)
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Compute deterministic hash of a file
 */
export function hashFile(filePath) {
  const content = require('fs').readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Compute deterministic hash of a string
 */
export function hashString(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Get deterministic git context (no timestamps)
 */
export function getGitContext() {
  const sha = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: 'pipe' })
    .stdout?.trim() || 'unknown';

  const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', stdio: 'pipe' })
    .stdout?.trim() || 'unknown';

  const isDirty = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8', stdio: 'pipe' })
    .stdout?.trim().length > 0;

  return {
    sha,
    branch,
    isDirty,
    shortSha: sha.substring(0, 8),
  };
}

/**
 * Get deterministic toolchain fingerprint (versions only, no paths or timestamps)
 */
export function getToolchainFingerprint() {
  const nodeVersion = process.version;

  const pnpmVersion = spawnSync('pnpm', ['--version'], { encoding: 'utf8', stdio: 'pipe' })
    .stdout?.trim() || 'unknown';

  const gitVersion = spawnSync('git', ['--version'], { encoding: 'utf8', stdio: 'pipe' })
    .stdout?.trim().replace('git version ', '') || 'unknown';

  return {
    node: nodeVersion,
    pnpm: pnpmVersion,
    git: gitVersion,
  };
}

/**
 * Validate that an object contains NO non-deterministic fields
 * Returns array of violations
 */
export function validateDeterminism(obj, path = '') {
  const violations = [];

  const nonDeterministicKeys = [
    'timestamp', 'startedAt', 'finishedAt', 'lastHeartbeatAt',
    'createdAt', 'updatedAt', 'now', 'date', 'time',
    'hostname', 'host', 'username', 'user',
    'pid', 'processId', 'randomId', 'uuid', 'guid'
  ];

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    // Check for banned keys
    if (nonDeterministicKeys.includes(key.toLowerCase())) {
      violations.push({
        path: currentPath,
        type: 'banned_key',
        message: `Non-deterministic key "${key}" found`,
      });
    }

    // Check for ISO timestamp strings
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      violations.push({
        path: currentPath,
        type: 'timestamp_value',
        message: `ISO timestamp value found: "${value}"`,
      });
    }

    // Recurse into objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      violations.push(...validateDeterminism(value, currentPath));
    }

    // Recurse into arrays
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === 'object') {
          violations.push(...validateDeterminism(item, `${currentPath}[${index}]`));
        }
      });
    }
  }

  return violations;
}

/**
 * Sort object keys recursively for deterministic JSON output
 */
export function sortObjectKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = sortObjectKeys(obj[key]);
        return sorted;
      }, {});
  }
  return obj;
}

/**
 * Write JSON file with deterministic formatting (sorted keys, stable indentation)
 */
export async function writeDeterministicJSON(filePath, data) {
  const sorted = sortObjectKeys(data);
  const json = JSON.stringify(sorted, null, 2);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, json + '\n', 'utf8');
}

/**
 * Generate checksums file for a directory
 * Returns content-addressed manifest
 */
export async function generateChecksums(directory) {
  const checksums = [];

  async function walk(dir, relativeTo) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    // Sort entries for deterministic order
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(relativeTo, fullPath);

      if (entry.isDirectory()) {
        await walk(fullPath, relativeTo);
      } else if (entry.isFile()) {
        const hash = hashFile(fullPath);
        const stats = await fs.stat(fullPath);
        checksums.push({
          file: relativePath,
          sha256: hash,
          size: stats.size,
        });
      }
    }
  }

  await walk(directory, directory);
  return checksums;
}

/**
 * Verify checksums match
 */
export function verifyChecksums(expected, actual) {
  const expectedMap = new Map(expected.map(e => [e.file, e]));
  const actualMap = new Map(actual.map(a => [a.file, a]));

  const mismatches = [];

  for (const [file, expectedEntry] of expectedMap) {
    const actualEntry = actualMap.get(file);

    if (!actualEntry) {
      mismatches.push({ file, issue: 'missing', expected: expectedEntry.sha256 });
    } else if (expectedEntry.sha256 !== actualEntry.sha256) {
      mismatches.push({
        file,
        issue: 'hash_mismatch',
        expected: expectedEntry.sha256,
        actual: actualEntry.sha256,
      });
    } else if (expectedEntry.size !== actualEntry.size) {
      mismatches.push({
        file,
        issue: 'size_mismatch',
        expected: expectedEntry.size,
        actual: actualEntry.size,
      });
    }
  }

  for (const file of actualMap.keys()) {
    if (!expectedMap.has(file)) {
      mismatches.push({ file, issue: 'unexpected' });
    }
  }

  return mismatches;
}
