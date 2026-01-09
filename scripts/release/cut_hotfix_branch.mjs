#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import yaml from 'js-yaml';
import {
  buildHotfixSnapshot,
  formatBranchName,
  normalizeCommitList,
  parseVersionString,
  stableStringify,
  hashFile,
} from './hotfix-utils.mjs';

const { values } = parseArgs({
  options: {
    'base-tag': { type: 'string' },
    'target-version': { type: 'string' },
    'commits': { type: 'string' },
    'commits-file': { type: 'string' },
    policy: { type: 'string', default: 'release/HOTFIX_POLICY.yml' },
    output: { type: 'string' },
  },
  strict: false,
});

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function runGit(cmd, options = {}) {
  return execSync(cmd, { encoding: 'utf-8', ...options }).trim();
}

function loadPolicy(path) {
  if (!existsSync(path)) {
    fail(`Hotfix policy not found: ${path}`);
  }
  const policy = yaml.load(readFileSync(path, 'utf-8'));
  if (!policy || typeof policy !== 'object') {
    fail(`Hotfix policy is invalid: ${path}`);
  }
  return policy;
}

function readCommits() {
  if (values['commits-file']) {
    if (!existsSync(values['commits-file'])) {
      fail(`Commits file not found: ${values['commits-file']}`);
    }
    return readFileSync(values['commits-file'], 'utf-8');
  }
  return values.commits || '';
}

function ensureCleanWorkingTree() {
  const status = runGit('git status --porcelain');
  if (status.length > 0) {
    fail('Working tree is not clean; commit or stash changes first');
  }
}

function updateVersionFiles(files, baseVersion, targetVersion) {
  const updated = [];
  for (const file of files) {
    if (!existsSync(file)) {
      continue;
    }
    const raw = readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.version) {
      continue;
    }
    if (parsed.version !== baseVersion && parsed.version !== `v${baseVersion}`) {
      continue;
    }
    parsed.version = targetVersion;
    writeFileSync(file, JSON.stringify(parsed, null, 2) + '\n');
    updated.push(file);
  }
  return updated;
}

if (!values['base-tag']) {
  fail('Missing --base-tag');
}
if (!values['target-version']) {
  fail('Missing --target-version');
}

const policy = loadPolicy(values.policy);
const baseTag = values['base-tag'];
const targetVersion = values['target-version'];
const baseTagPattern = new RegExp(policy.allowed_base_tag_pattern);
if (!baseTagPattern.test(baseTag)) {
  fail(`Base tag ${baseTag} does not match allowed pattern ${policy.allowed_base_tag_pattern}`);
}

const baseParsed = parseVersionString(baseTag);
const targetParsed = parseVersionString(targetVersion);
if (
  baseParsed.major !== targetParsed.major ||
  baseParsed.minor !== targetParsed.minor ||
  targetParsed.patch !== baseParsed.patch + 1
) {
  fail(`Target version ${targetVersion} must be base patch +1 from ${baseParsed.normalized}`);
}

const baseVersion = baseParsed.normalized;
const branchName = formatBranchName(policy.branch.template, targetParsed.normalized);
const branchPattern = new RegExp(policy.branch.pattern);
if (!branchPattern.test(branchName)) {
  fail(`Branch name ${branchName} does not match policy pattern ${policy.branch.pattern}`);
}
const commits = normalizeCommitList(readCommits());
if (commits.length === 0) {
  fail('No commits provided for hotfix selection');
}

ensureCleanWorkingTree();

const baseCommit = runGit(`git rev-parse "${baseTag}^{commit}"`);

const branchExists = (() => {
  try {
    runGit(`git show-ref --verify refs/heads/${branchName}`);
    return true;
  } catch (error) {
    return false;
  }
})();

if (branchExists) {
  fail(`Branch already exists: ${branchName}`);
}

runGit(`git checkout --detach ${baseTag}`);
runGit(`git checkout -b ${branchName}`);

try {
  for (const commit of commits) {
    const resolved = runGit(`git rev-parse "${commit}^{commit}"`);
    runGit(`git cherry-pick -x ${resolved}`, { stdio: 'inherit' });
  }
} catch (error) {
  try {
    runGit('git cherry-pick --abort', { stdio: 'inherit' });
  } catch (abortError) {
    console.error('Failed to abort cherry-pick after conflict');
  }
  fail('Cherry-pick failed; resolve conflicts manually before retrying');
}

const allowMergeCommits = Boolean(policy.allowed_merge_commits);
if (!allowMergeCommits) {
  const merges = runGit(`git rev-list --merges ${baseCommit}..HEAD`);
  if (merges.length > 0) {
    fail('Merge commits detected in hotfix branch; merge commits are not allowed');
  }
}

const versionFiles = policy.version_files || [];
const updatedFiles = updateVersionFiles(versionFiles, baseVersion, targetParsed.normalized);

const lockfiles = policy.lockfiles || [];
const lockfileHashes = {};
for (const file of lockfiles) {
  if (existsSync(file)) {
    lockfileHashes[file] = hashFile(file);
  }
}

const snapshotPath = `release/hotfix-snapshots/v${targetParsed.normalized}.json`;
if (existsSync(snapshotPath)) {
  fail(`Snapshot already exists: ${snapshotPath}`);
}

const snapshot = buildHotfixSnapshot({
  baseTag,
  baseCommit,
  branchName,
  selectedCommits: commits.map(commit => runGit(`git rev-parse "${commit}^{commit}"`)),
  resultingCommit: runGit('git rev-parse HEAD'),
  lockfileHashes,
  generatedAt: new Date().toISOString(),
});

writeFileSync(snapshotPath, stableStringify(snapshot));

const commitFiles = [...new Set([...updatedFiles, snapshotPath])];
if (commitFiles.length > 0) {
  runGit(`git add ${commitFiles.join(' ')}`);
  runGit(`git commit -m "chore(release): prepare hotfix v${targetParsed.normalized}"`);
}

const outputSummary = {
  version: '1.0.0',
  branch_name: branchName,
  base_commit: baseCommit,
  head_commit: runGit('git rev-parse HEAD'),
  snapshot_path: snapshotPath,
  updated_files: commitFiles,
  generated_at: new Date().toISOString(),
};

const output = stableStringify(outputSummary);
if (values.output) {
  writeFileSync(values.output, output, 'utf-8');
} else {
  process.stdout.write(output);
}
