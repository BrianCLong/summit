#!/usr/bin/env -S npx tsx

import { execSync } from 'child_process';

type StatusCheck = {
  name?: string;
  conclusion?: string;
};

type PullRequest = {
  number: number;
  mergeable: string | null;
  additions?: number;
  deletions?: number;
  statusCheckRollup?: StatusCheck[];
};

const args = process.argv.slice(2);
const prsArg = args.find(a => a.startsWith('prs='));
const limitArg = args.find(a => a.startsWith('limit='));
const parsedLimit = limitArg ? Number(limitArg.split('=')[1]) : 10;
if (limitArg && (!Number.isFinite(parsedLimit) || parsedLimit < 1)) {
  console.error('Deferred pending valid limit input (limit must be a positive number).');
  process.exit(1);
}
const limit = Math.max(1, Math.floor(parsedLimit));

const isAutoMode = !prsArg || prsArg.endsWith('=auto');

const pickAutoPrs = (): string[] => {
  try {
    const prsJson = execSync(
      `gh pr list --state open --limit ${limit} --json number,mergeable,additions,deletions,statusCheckRollup`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const prs: PullRequest[] = JSON.parse(prsJson);
    const eligible = prs
      .filter(pr => pr.mergeable === 'MERGEABLE')
      .filter(pr =>
        (pr.statusCheckRollup ?? []).some(
          check => check.name === 'fast / fast' && check.conclusion === 'SUCCESS',
        ),
      )
      .sort((a, b) => {
        const sizeA = (a.additions ?? 0) + (a.deletions ?? 0);
        const sizeB = (b.additions ?? 0) + (b.deletions ?? 0);
        if (sizeA !== sizeB) {
          return sizeA - sizeB;
        }
        return a.number - b.number;
      })
      .slice(0, limit)
      .map(pr => pr.number.toString());

    if (eligible.length === 0) {
      console.error('Deferred pending merge-train eligibility: no green, mergeable PRs found.');
      process.exit(1);
    }

    console.log(`Auto-selected PRs: ${eligible.join(', ')}`);
    return eligible;
  } catch (error) {
    console.error('Deferred pending gh availability. Provide prs=123,456 to proceed.');
    process.exit(1);
  }
};

const prs = isAutoMode
  ? pickAutoPrs()
  : prsArg
      .split('=')[1]
      .split(',')
      .map(pr => pr.trim())
      .filter(Boolean);

if (prs.length === 0) {
  console.error('Deferred pending PR selection. Provide prs=123,456 to proceed.');
  process.exit(1);
}

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
        console.log(`  ⚠️ Could not fetch PR #${pr}. Deferred pending remote access. Skipping merge step.`);
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
