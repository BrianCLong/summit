#!/usr/bin/env node
/**
 * verify-post-deploy-evidence.mjs
 *
 * Validates that the post-deploy canary evidence bundle exists and is
 * well-formed JSON. Called by `pnpm evidence:post-deploy:verify`.
 *
 * Exits 0 on success, 1 on failure.
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const sha = process.env.GITHUB_SHA
  ?? execSync('git rev-parse HEAD').toString().trim();

const evidencePath = `artifacts/evidence/post-deploy/${sha}/canary.json`;

if (!existsSync(evidencePath)) {
  console.error(`[FAIL] Post-deploy evidence not found: ${evidencePath}`);
  console.error('       Run `pnpm evidence:post-deploy:gen` before verifying.');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(evidencePath, 'utf8'));
} catch (err) {
  console.error(`[FAIL] Evidence file is not valid JSON: ${evidencePath}`);
  console.error(`       ${err.message}`);
  process.exit(1);
}

const checks = data.checks ?? data.results ?? [];
const passed = checks.filter(c => c.status === 'pass').length;
const failed = checks.filter(c => c.status === 'fail').length;

console.log(`[OK]  Post-deploy evidence verified: ${evidencePath}`);
console.log(`      Checks: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('[WARN] Some canary checks failed — review evidence before proceeding.');
  // Non-zero exit for failed checks so CI can surface the issue.
  process.exit(1);
}
