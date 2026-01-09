#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { execSync, spawnSync } from 'node:child_process';
import { exit, argv } from 'node:process';
import { readFileSync, writeFileSync } from 'node:fs';
import { EOL } from 'node:os';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';

// --- Configuration & Argument Parsing ---

const args = argv.slice(2).filter(arg => arg !== '--');
const { values } = parseArgs({
  args,
  options: {
    'base-branch': { type: 'string', default: 'main' },
    'rc-number': { type: 'string' }, // Manual override for the '.N' part
    remote: { type: 'string', default: 'origin' },
    push: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
});

const CONFIG_PATH = 'release/RELEASE_CONFIG.yml';
const SNAPSHOT_PATH = 'release/release-snapshot.json';

// --- Helper Functions ---

function run(command, options = {}) {
  const { check = true, log = true } = options;
  if (log) {
    console.error(`> ${command}`);
  }
  if (values['dry-run']) {
    return { stdout: '', stderr: '', status: 0 };
  }
  const result = spawnSync(command, { shell: true, encoding: 'utf-8' });
  if (check && result.status !== 0) {
    console.error(`Error running command: ${command}`);
    console.error(result.stderr);
    exit(1);
  }
  return result;
}

function getFormattedDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateNextRcNumber(branchPrefix) {
    const cmd = `git branch --list --remote "${values.remote}/${branchPrefix}*"`;
    const { stdout } = run(cmd, { check: false, log: false });
    const remoteBranches = stdout.trim().split(EOL).map(b => b.trim());

    let maxRc = -1;
    for (const branch of remoteBranches) {
        const match = branch.match(/rc\.(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxRc) {
                maxRc = num;
            }
        }
    }
    return maxRc + 1;
}

// --- Main Execution ---

function main() {
  console.error('🚀 Starting Release Candidate cut process...');

  // 1. Load configuration
  const config = yaml.load(readFileSync(CONFIG_PATH, 'utf8'));

  // 1a. Authorize actor
  const actor = process.env.GITHUB_ACTOR;
  if (actor) {
    const authorized_actors = config.authorized_actors;
    if (!authorized_actors.includes(actor) && !authorized_actors.includes('*')) {
      console.error(`❌ Error: Actor '${actor}' is not authorized to cut a release.`);
      exit(1);
    }
    console.error(`✅ Actor '${actor}' is authorized.`);
  } else {
    console.error('⚠️ GITHUB_ACTOR environment variable not set. Skipping authorization check.');
  }
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const version = pkg.version;

  // 2. Safety checks
  console.error(`\n🔍 Performing safety checks...`);
  const gitStatus = run('git status --porcelain', { log: false }).stdout;
  if (gitStatus) {
    console.error('❌ Error: Working directory is not clean. Please commit or stash your changes.');
    console.error(gitStatus)
    exit(1);
  }
  console.error('✅ Git working directory is clean.');

  const currentBranch = run('git rev-parse --abbrev-ref HEAD', { log: false }).stdout.trim();
  if (currentBranch !== values['base-branch']) {
    console.error(`❌ Error: Must be on the '${values['base-branch']}' branch. Currently on '${currentBranch}'.`);
    exit(1);
  }
  console.error(`✅ On correct base branch ('${values['base-branch']}').`);

  run(`git fetch ${values.remote}`);
  console.error(`✅ Fetched from remote '${values.remote}'.`);

  // 3. Determine RC branch name
  console.error(`\n📝 Determining RC branch name...`);
  const dateStr = getFormattedDate();
  const branchPrefix = config.branch_naming_format
    .replace('YYYY-MM-DD', dateStr)
    .replace('.N', '.');

  const rcNumber = values['rc-number']
    ? parseInt(values['rc-number'], 10)
    : calculateNextRcNumber(branchPrefix);

  if (isNaN(rcNumber)) {
      console.error(`❌ Error: Invalid RC number override: ${values['rc-number']}`);
      exit(1);
  }

  const branchName = `${branchPrefix}${rcNumber}`;
  console.error(`✅ Calculated branch name: ${branchName}`);

  // 4. Create release snapshot
  console.error(`\n📦 Creating release snapshot...`);
  const commitSha = run('git rev-parse HEAD', { log: false }).stdout.trim();
  const lockfileContent = readFileSync('pnpm-lock.yaml');
  const lockfileHash = createHash('sha256').update(lockfileContent).digest('hex');

  // Calculate dependency delta
  const diff = run(`git diff origin/${values['base-branch']} -- pnpm-lock.yaml`, { log: false }).stdout;
  const added = (diff.match(/^\+/gm) || []).length;
  const removed = (diff.match(/^-/gm) || []).length;
  const dependencyDelta = {
    added: added,
    removed: removed,
  };

  const snapshot = {
    commitSha,
    version,
    lockfileHash,
    dependencyDelta,
    branchName,
    createdAt: new Date().toISOString(),
  };

  console.error('📝 Snapshot data:', JSON.stringify(snapshot, null, 2));

  // 5. Perform Git operations
  console.error(`\n🚀 Executing Git operations...`);
  run(`git checkout -b ${branchName}`);

  if (!values['dry-run']) {
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + EOL);
    console.error(`✅ Wrote snapshot to ${SNAPSHOT_PATH}`);
  } else {
    console.error(`[DRY RUN] Would write snapshot to ${SNAPSHOT_PATH}`);
  }

  run(`git add ${SNAPSHOT_PATH}`);

  const commitMessage = `chore(release): cut ${version} RC branch ${branchName}`;
  run(`git commit -m "${commitMessage}"`);

  if (values.push) {
    run(`git push -u ${values.remote} ${branchName}`);
    console.error(`✅ Pushed branch to ${values.remote}.`);
  } else {
    console.error(`\n✨ Branch '${branchName}' is ready locally.`);
    console.error(`Run with --push to push to remote.`);
  }

  // 6. Output machine-readable metadata
  const output = {
      success: true,
      branchName,
      commitSha,
      version,
      rcNumber,
      dryRun: values['dry-run'],
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
