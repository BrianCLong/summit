#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const options = {
  'bundle-dir': { type: 'string', default: '.' },
  help: { type: 'boolean', default: false },
};

const { values } = parseArgs({ options, strict: false });

if (values.help) {
  console.log(`Usage: verify_artifact_inventory.mjs --bundle-dir <dir>

Validates SHA256SUMS and inventory.json by recomputing digests, sizes, and
ensuring no missing or extra files.
`);
  process.exit(0);
}

const BUNDLE_DIR = resolve(values['bundle-dir']);
const SUMS_PATH = join(BUNDLE_DIR, 'SHA256SUMS');
const INVENTORY_PATH = join(BUNDLE_DIR, 'inventory.json');
const EXCLUDED = new Set(['SHA256SUMS', 'inventory.json']);

const errors = [];
const checks = [];

const addError = (code, message) => {
  console.error(`❌ [${code}] ${message}`);
  errors.push({ code, message });
};

const addCheck = (message) => {
  console.log(`✅ ${message}`);
  checks.push(message);
};

const normalizePath = (input) => input.replace(/\\/g, '/').replace(/^\.\//, '');

const listFiles = (dir) => {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return listFiles(fullPath);
    }
    return fullPath;
  });
};

const sha256 = (filePath) => {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
};

if (!existsSync(BUNDLE_DIR)) {
  addError('BUNDLE_MISSING', `Bundle directory not found: ${BUNDLE_DIR}`);
}

if (!existsSync(SUMS_PATH)) {
  addError('SHA256SUMS_MISSING', 'SHA256SUMS not found in bundle.');
}

if (!existsSync(INVENTORY_PATH)) {
  addError('INVENTORY_MISSING', 'inventory.json not found in bundle.');
}

if (errors.length > 0) {
  process.exit(1);
}

const sumsContent = readFileSync(SUMS_PATH, 'utf-8');
const sumsMap = new Map();
sumsContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  const match = trimmed.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
  if (!match) return;
  const relPath = normalizePath(match[2].trim());
  if (EXCLUDED.has(relPath)) return;
  sumsMap.set(relPath, match[1].toLowerCase());
});
addCheck(`Loaded SHA256SUMS with ${sumsMap.size} entries`);

let inventoryJson;
try {
  inventoryJson = JSON.parse(readFileSync(INVENTORY_PATH, 'utf-8'));
} catch (error) {
  addError('INVENTORY_INVALID_JSON', `Failed to parse inventory.json: ${error.message}`);
}

if (errors.length > 0) {
  process.exit(1);
}

const inventoryEntries = Array.isArray(inventoryJson)
  ? inventoryJson
  : Array.isArray(inventoryJson?.files)
    ? inventoryJson.files
    : null;

if (!inventoryEntries) {
  addError('INVENTORY_INVALID_FORMAT', 'inventory.json must be an array or contain a files array.');
  process.exit(1);
}

const inventoryMap = new Map();
for (const entry of inventoryEntries) {
  if (!entry || typeof entry.path !== 'string') {
    addError('INVENTORY_ENTRY_INVALID', 'Inventory entry missing path.');
    continue;
  }

  const relPath = normalizePath(entry.path);
  if (EXCLUDED.has(relPath)) continue;

  const digestValue =
    entry.sha256 ?? entry.digest ?? entry.hash ?? entry.checksum ?? null;
  const sizeValue = entry.size;

  if (typeof digestValue !== 'string' || !/^[a-fA-F0-9]{64}$/.test(digestValue)) {
    addError(
      'INVENTORY_DIGEST_INVALID',
      `Inventory entry has invalid digest for ${relPath}.`
    );
    continue;
  }

  if (typeof sizeValue !== 'number' || Number.isNaN(sizeValue)) {
    addError(
      'INVENTORY_SIZE_INVALID',
      `Inventory entry has invalid size for ${relPath}.`
    );
    continue;
  }

  if (inventoryMap.has(relPath)) {
    addError('INVENTORY_DUPLICATE', `Duplicate inventory entry for ${relPath}.`);
    continue;
  }

  inventoryMap.set(relPath, {
    sha256: digestValue.toLowerCase(),
    size: sizeValue,
  });
}

if (errors.length > 0) {
  process.exit(1);
}

addCheck(`Loaded inventory.json with ${inventoryMap.size} entries`);

const diskFiles = new Set();
for (const fullPath of listFiles(BUNDLE_DIR)) {
  const relPath = normalizePath(relative(BUNDLE_DIR, fullPath));
  if (EXCLUDED.has(relPath)) continue;
  diskFiles.add(relPath);
}

const digestCache = new Map();
const getDigest = (relPath) => {
  if (digestCache.has(relPath)) return digestCache.get(relPath);
  const fullPath = join(BUNDLE_DIR, relPath);
  const digest = sha256(fullPath);
  digestCache.set(relPath, digest);
  return digest;
};

for (const relPath of diskFiles) {
  if (!sumsMap.has(relPath)) {
    addError('SHA256SUMS_MISSING_ENTRY', `File missing from SHA256SUMS: ${relPath}`);
  }
  if (!inventoryMap.has(relPath)) {
    addError('INVENTORY_MISSING_ENTRY', `File missing from inventory.json: ${relPath}`);
  }
}

for (const relPath of sumsMap.keys()) {
  if (!diskFiles.has(relPath)) {
    addError('SHA256SUMS_EXTRA_ENTRY', `SHA256SUMS lists missing file: ${relPath}`);
  }
  if (!inventoryMap.has(relPath)) {
    addError('INVENTORY_MISSING_ENTRY', `Inventory missing SHA256SUMS file: ${relPath}`);
  }
}

for (const relPath of inventoryMap.keys()) {
  if (!diskFiles.has(relPath)) {
    addError('INVENTORY_EXTRA_ENTRY', `Inventory lists missing file: ${relPath}`);
  }
  if (!sumsMap.has(relPath)) {
    addError('SHA256SUMS_MISSING_ENTRY', `SHA256SUMS missing inventory file: ${relPath}`);
  }
}

for (const relPath of diskFiles) {
  if (!sumsMap.has(relPath) || !inventoryMap.has(relPath)) {
    continue;
  }

  const fullPath = join(BUNDLE_DIR, relPath);
  const stats = statSync(fullPath);
  const digest = getDigest(relPath);

  const expectedDigest = sumsMap.get(relPath);
  if (expectedDigest && digest !== expectedDigest) {
    addError(
      'SHA256SUMS_DIGEST_MISMATCH',
      `SHA256SUMS digest mismatch for ${relPath}.`
    );
  }

  const inventoryEntry = inventoryMap.get(relPath);
  if (inventoryEntry && digest !== inventoryEntry.sha256) {
    addError(
      'INVENTORY_DIGEST_MISMATCH',
      `Inventory digest mismatch for ${relPath}.`
    );
  }

  if (inventoryEntry && stats.size !== inventoryEntry.size) {
    addError(
      'INVENTORY_SIZE_MISMATCH',
      `Inventory size mismatch for ${relPath}.`
    );
  }
}

if (errors.length > 0) {
  console.error(`❌ Verification failed with ${errors.length} error(s).`);
  process.exit(1);
}

addCheck('Artifact inventory verification passed.');
