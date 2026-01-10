#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i];
  if (key.startsWith('--')) {
    const value = process.argv[i + 1];
    args.set(key, value);
    i += 1;
  }
}

const targetArg = args.get('--dir');
if (!targetArg || targetArg.startsWith('--')) {
  console.error('Usage: node scripts/release/verify_artifact_inventory.mjs --dir <artifact-dir>');
  process.exit(1);
}

const targetDir = resolve(targetArg);
const inventoryPath = resolve(args.get('--inventory') || join(targetDir, 'release-artifacts', 'inventory.json'));
const sumsPath = resolve(args.get('--sums') || join(targetDir, 'release-artifacts', 'SHA256SUMS'));

const errors = [];

function toPosixPath(pathValue) {
  return pathValue.split(sep).join('/');
}

function listFiles(dirPath, collector) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      listFiles(entryPath, collector);
    } else if (entry.isFile()) {
      collector.push(entryPath);
    }
  }
}

function sha256File(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

function parseSha256Sums(content) {
  const entries = new Map();
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/);
    if (!match) {
      errors.push(`[SHA256SUMS_INVALID] Invalid line format: ${line}`);
      continue;
    }
    const [, hash, file] = match;
    if (entries.has(file)) {
      errors.push(`[SHA256SUMS_DUPLICATE] Duplicate entry for ${file}`);
      continue;
    }
    entries.set(file, hash);
  }
  return entries;
}

function assertFileExists(pathValue, label) {
  try {
    statSync(pathValue);
  } catch {
    errors.push(`[MISSING_REQUIRED_FILE] ${label} not found: ${pathValue}`);
  }
}

assertFileExists(inventoryPath, 'inventory.json');
assertFileExists(sumsPath, 'SHA256SUMS');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

let inventory;
try {
  inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
} catch (error) {
  console.error(`[INVENTORY_INVALID_JSON] ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(inventory.artifacts)) {
  console.error('[INVENTORY_INVALID_FORMAT] inventory.artifacts must be an array');
  process.exit(1);
}

const inventoryEntries = new Map();
for (const entry of inventory.artifacts) {
  if (!entry || typeof entry.path !== 'string') {
    errors.push('[INVENTORY_ENTRY_INVALID] Each artifact must include a path');
    continue;
  }
  inventoryEntries.set(entry.path, entry);
}

const sumsEntries = parseSha256Sums(readFileSync(sumsPath, 'utf8'));

const inventoryPaths = new Set(inventoryEntries.keys());
const sumsPaths = new Set(sumsEntries.keys());

for (const pathValue of inventoryPaths) {
  if (!sumsPaths.has(pathValue)) {
    errors.push(`[MISSING_IN_SHA256SUMS] ${pathValue} missing from SHA256SUMS`);
  }
}

for (const pathValue of sumsPaths) {
  if (!inventoryPaths.has(pathValue)) {
    errors.push(`[EXTRA_IN_SHA256SUMS] ${pathValue} present in SHA256SUMS but missing from inventory.json`);
  }
}

const inventoryDir = resolve(targetDir, 'release-artifacts');
const allowExtra = new Set([
  toPosixPath(relative(targetDir, inventoryPath)),
  toPosixPath(relative(targetDir, sumsPath))
]);

const actualFiles = [];
listFiles(targetDir, actualFiles);
const actualPaths = actualFiles.map(filePath => toPosixPath(relative(targetDir, filePath)));

for (const actual of actualPaths) {
  if (inventoryPaths.has(actual)) {
    continue;
  }
  if (allowExtra.has(actual)) {
    continue;
  }
  if (actual.startsWith(`${toPosixPath(relative(targetDir, inventoryDir))}/`)) {
    errors.push(`[UNEXPECTED_RELEASE_ARTIFACT] ${actual} not allowed in release-artifacts`);
    continue;
  }
  errors.push(`[EXTRA_FILE] ${actual} not present in inventory.json`);
}

for (const expected of inventoryPaths) {
  if (!actualPaths.includes(expected)) {
    errors.push(`[MISSING_FILE] ${expected} listed in inventory.json but missing on disk`);
  }
}

for (const [pathValue, entry] of inventoryEntries.entries()) {
  const filePath = join(targetDir, pathValue);
  try {
    const stats = statSync(filePath);
    if (stats.size !== entry.size) {
      errors.push(`[SIZE_MISMATCH] ${pathValue} expected ${entry.size}, got ${stats.size}`);
    }
    const actualHash = sha256File(filePath);
    if (actualHash !== entry.sha256) {
      errors.push(`[HASH_MISMATCH] ${pathValue} expected ${entry.sha256}, got ${actualHash}`);
    }
    const sumHash = sumsEntries.get(pathValue);
    if (sumHash && sumHash !== actualHash) {
      errors.push(`[SHA256SUMS_MISMATCH] ${pathValue} expected ${sumHash}, got ${actualHash}`);
    }
  } catch (error) {
    errors.push(`[FILE_CHECK_FAILED] ${pathValue} ${error.message}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Release artifact inventory verification passed.');
