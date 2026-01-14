#!/usr/bin/env node

/**
 * Dependency Risk Runner
 *
 * Routes to appropriate risk check based on context:
 * - PR mode: runs scripts/pr-risk-score.js (requires PR number)
 * - Main/Nightly mode: runs scripts/ci/dependency-complexity-check.ts
 *
 * Usage: node scripts/ci/dependency_risk_runner.mjs
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const mode = process.env.GOVERNANCE_MODE || 'pr';
const prNumber = process.env.PR_NUMBER || process.env.GITHUB_PR_NUMBER;

console.log(`[Dependency Risk] Running in mode: ${mode}`);

let scriptToRun;
let args = [];
let env = { ...process.env };

if (mode === 'pr') {
  if (!prNumber) {
    console.warn('[Dependency Risk] PR mode selected but no PR number found. Skipping risk check (or failing if strict).');
    // For now, we simulate success or fail depending on strictness.
    // If strict, we should fail. But typically local runs won't have PR number.
    if (process.env.CI) {
      console.error('Error: PR_NUMBER is required in CI for PR mode.');
      process.exit(1);
    } else {
      console.log('Skipping PR risk check in local environment.');
      process.exit(0);
    }
  }

  console.log(`[Dependency Risk] Executing PR Risk Score for PR #${prNumber}`);
  scriptToRun = path.join(ROOT_DIR, 'scripts/pr-risk-score.js');
  args = [prNumber];

} else {
  // Main or Nightly or other
  console.log('[Dependency Risk] Executing Dependency Complexity Check');
  scriptToRun = path.join(ROOT_DIR, 'scripts/ci/dependency-complexity-check.ts');
  // tsx or ts-node might be needed if it's a TS file
  // The original script list shows it as .ts and package.json scripts use npx tsx or node depending on compile status.
  // The script `dependency-complexity-check.ts` imports from `../architecture/dependency-graph.js` which suggests it might need compilation or `tsx`.
  // package.json doesn't show a direct run script for it, but `ci:dependency-complexity-check` isn't there.
  // We'll use `npx tsx` to run it.
}

let result;
if (scriptToRun.endsWith('.ts')) {
   result = spawnSync('npx', ['tsx', scriptToRun, ...args], { stdio: 'inherit', env, shell: true });
} else {
   result = spawnSync('node', [scriptToRun, ...args], { stdio: 'inherit', env });
}

process.exit(result.status ?? 1);
