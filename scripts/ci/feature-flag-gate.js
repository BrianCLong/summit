#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const [, , rawFlag] = process.argv;

if (!rawFlag) {
  console.error('Usage: node scripts/ci/feature-flag-gate.js <FLAG_NAME>');
  process.exit(1);
}

const flagKey = rawFlag
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const configPath = path.join(root, 'config', 'feature-flags.json');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!config.flags || !config.flags[flagKey]) {
  console.error(`❌ Missing feature flag entry for ${flagKey} in ${configPath}`);
  process.exit(1);
}

const flag = config.flags[flagKey];
const errors = [];

if (flag.type !== 'boolean') {
  errors.push('Flag must be boolean for gating and rollout safety.');
}

if (flag.defaultValue !== false) {
  errors.push('Flag default must be false to enforce opt-in preview rollout.');
}

if (!flag.rollout || typeof flag.rollout !== 'object') {
  errors.push('Flag must declare a rollout policy.');
}

if (!flag.tags || !Array.isArray(flag.tags) || flag.tags.length === 0) {
  errors.push('Flag must include descriptive tags for ownership and targeting.');
}

if (!flag.metadata || !flag.metadata.branch || !flag.metadata.label) {
  errors.push('Flag metadata must capture branch and label for traceability.');
}

if (errors.length > 0) {
  console.error(`❌ Feature flag validation failed for ${flagKey}:`);
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`✅ Feature flag ${flagKey} is configured for safe preview rollout.`);
