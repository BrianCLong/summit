#!/usr/bin/env node

/**
 * CI validation: Verify all high-risk feature flags default to OFF in production.
 *
 * This script reads flags/targets/prod.yaml (JSON format) and asserts that
 * every flag listed in HIGH_RISK_FLAGS has value=false and percentage=0.
 *
 * Exit code 0 = pass, 1 = fail.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(__dirname, '..', '..');

const HIGH_RISK_FLAGS = [
  'feature.investigation.bulk-operations',
  'feature.investigation.delete',
  'feature.investigation.export',
  'feature.osint.ingestion',
  'feature.osint.enrichment',
  'feature.graph.cross-tenant-visibility',
];

const prodTargetsPath = join(repoRoot, 'flags', 'targets', 'prod.yaml');

try {
  const content = readFileSync(prodTargetsPath, 'utf8');
  const targets = JSON.parse(content);
  const flags = targets.flags || {};
  let failed = false;

  for (const key of HIGH_RISK_FLAGS) {
    const flag = flags[key];
    if (!flag) {
      console.error(`FAIL: ${key} is missing from prod targets`);
      failed = true;
      continue;
    }
    if (flag.value !== false) {
      console.error(`FAIL: ${key} has value=${flag.value} (expected false)`);
      failed = true;
    }
    if (flag.percentage !== 0) {
      console.error(`FAIL: ${key} has percentage=${flag.percentage} (expected 0)`);
      failed = true;
    }
  }

  if (failed) {
    console.error('\nHigh-risk flags are NOT safely configured in production.');
    process.exit(1);
  }

  console.log(`PASS: All ${HIGH_RISK_FLAGS.length} high-risk flags are OFF in prod targets.`);
  process.exit(0);
} catch (err) {
  console.error(`Error reading prod targets: ${err.message}`);
  process.exit(1);
}
