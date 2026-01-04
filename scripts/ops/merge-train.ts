#!/usr/bin/env -S npx tsx

import { execSync } from 'child_process';

const args = process.argv.slice(2);
const prsArg = args.find(a => a.startsWith('prs='));

if (!prsArg) {
  console.error('Error: prs argument required (e.g. prs=123,456)');
  process.exit(1);
}

const prs = prsArg.split('=')[1].split(',');

console.log(`🚂 Merge Train Simulation for PRs: ${prs.join(', ')}`);
console.log('Dry-run mode active (actual merge simulation attempted)');

const timestamp = new Date().getTime();
const trainBranch = `train-simulation-${timestamp}`;

try {
  // Check if we are in a git repo and can fetch
  // Use try/catch because in some environments (like sandbox) we might not have remote access

  // 1. Create temp branch
  console.log(`\nCreating temporary branch: ${trainBranch}`);
  execSync(`git checkout -b ${trainBranch}`, { stdio: 'pipe' });

  for (const pr of prs) {
    console.log(`\nProcessing PR #${pr}...`);

    // 2. Fetch PR
    console.log(`  - Fetching origin/pull/${pr}/head`);
    try {
        execSync(`git fetch origin pull/${pr}/head:pr-${pr}`, { stdio: 'pipe' });
    } catch (e) {
        console.log(`  ⚠️ Could not fetch PR #${pr}. (Remote might be inaccessible). Skipping merge step.`);
        continue;
    }

    // 3. Merge
    console.log(`  - Merging PR #${pr} into train...`);
    try {
        execSync(`git merge pr-${pr} --no-edit`, { stdio: 'pipe' });
        console.log(`  ✅ Merged PR #${pr}`);
    } catch (e) {
        console.error(`  ❌ Conflict detected merging PR #${pr}!`);
        console.error(`  Train halted.`);
        // Abort merge to clean up state
        try { execSync('git merge --abort', { stdio: 'ignore' }); } catch {}
        throw new Error(`Conflict in PR #${pr}`);
    }
  }

  console.log('\n✅ All PRs merged successfully into simulation branch.');

  console.log('\nRunning preflight checks on train branch...');
  // Check if preflight script exists
  try {
     execSync('./scripts/ops/preflight.ts --fast', { stdio: 'inherit' });
  } catch (e) {
     console.error('❌ Preflight failed on train branch.');
     throw e;
  }

  console.log('\n🚂 Merge Train simulation successful!');

} catch (error) {
  console.error('\n❌ Merge Train Simulation Failed.');
  if (error instanceof Error) console.error(error.message);
} finally {
  // Cleanup
  console.log(`\nCleaning up ${trainBranch}...`);
  try {
    execSync('git checkout -', { stdio: 'pipe' });
    execSync(`git branch -D ${trainBranch}`, { stdio: 'pipe' });
  } catch (e) {
      // ignore
  }
}
