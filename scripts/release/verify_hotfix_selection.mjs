#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import yaml from 'js-yaml';
import {
  ensureUniqueCommits,
  formatBranchName,
  normalizeCommitList,
  parseVersionString,
  stableStringify,
} from './hotfix-utils.mjs';

const { values } = parseArgs({
  options: {
    'base-tag': { type: 'string' },
    'target-version': { type: 'string' },
    'commits': { type: 'string' },
    'commits-file': { type: 'string' },
    policy: { type: 'string', default: 'release/HOTFIX_POLICY.yml' },
    actor: { type: 'string' },
    output: { type: 'string' },
  },
  strict: false,
});

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function runGit(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
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

function matchesAllowedActor(policy, actor) {
  const allowlist = policy?.actors?.allowlist || [];
  if (allowlist.length === 0) {
    return true;
  }
  if (!actor) {
    return false;
  }
  return allowlist.includes(actor) || allowlist.includes('*');
}

function compilePatterns(patterns) {
  return (patterns || []).map(pattern => new RegExp(pattern));
}

function isAllowedPath(path, allowedPatterns) {
  return allowedPatterns.some(pattern => pattern.test(path));
}

function isForbiddenPath(path, forbiddenPatterns, allowedPatterns) {
  if (!forbiddenPatterns.some(pattern => pattern.test(path))) {
    return false;
  }
  return !isAllowedPath(path, allowedPatterns);
}

function verifyApprovalLabel(commitSha, approvalLabel, requireMerged) {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) {
    fail('GITHUB_REPOSITORY is required to verify approvals');
  }
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch (error) {
    fail('GitHub CLI (gh) is required to verify approvals');
  }
  if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
    fail('GITHUB_TOKEN or GH_TOKEN is required to verify approvals');
  }

  const pullsRaw = execSync(
    `gh api -H "Accept: application/vnd.github+json" "/repos/${repo}/commits/${commitSha}/pulls"`,
    { encoding: 'utf-8' }
  );
  const pulls = JSON.parse(pullsRaw || '[]');
  const approved = pulls.find(pr => {
    const hasLabel = (pr.labels || []).some(label => label.name === approvalLabel);
    const merged = requireMerged ? Boolean(pr.merged_at) : true;
    return hasLabel && merged;
  });

  if (!approved) {
    fail(`Commit ${commitSha} is missing required approval label '${approvalLabel}'`);
  }
}

if (!values['base-tag']) {
  fail('Missing --base-tag');
}
if (!values['target-version']) {
  fail('Missing --target-version');
}

const policy = loadPolicy(values.policy);
const baseTagPattern = new RegExp(policy.allowed_base_tag_pattern);
const baseTag = values['base-tag'];
const targetVersion = values['target-version'];

if (!baseTagPattern.test(baseTag)) {
  fail(`Base tag ${baseTag} does not match allowed pattern ${policy.allowed_base_tag_pattern}`);
}

const baseVersion = parseVersionString(baseTag);
const targetParsed = parseVersionString(targetVersion);
if (
  baseVersion.major !== targetParsed.major ||
  baseVersion.minor !== targetParsed.minor ||
  targetParsed.patch !== baseVersion.patch + 1
) {
  fail(`Target version ${targetVersion} must be base patch +1 from ${baseVersion.normalized}`);
}

if (!matchesAllowedActor(policy, values.actor)) {
  fail(`Actor ${values.actor} is not authorized to run hotfix workflow`);
}

const branchName = formatBranchName(policy.branch.template, targetParsed.normalized);
const branchPattern = new RegExp(policy.branch.pattern);
if (!branchPattern.test(branchName)) {
  fail(`Branch name ${branchName} does not match policy pattern ${policy.branch.pattern}`);
}
const commitsRaw = readCommits();
const commits = normalizeCommitList(commitsRaw);
ensureUniqueCommits(commits);
if (commits.length === 0) {
  fail('No commits provided for hotfix selection');
}

const forbiddenPatterns = compilePatterns(policy.forbidden_paths || []);
const allowedPatterns = compilePatterns(policy.allowed_paths || []);
const allowedBranches = policy.allowed_source_branches || ['main'];
const allowMergeCommits = Boolean(policy.allowed_merge_commits);
const approvalLabel = policy?.approvals?.label;
const requireApproval = Boolean(policy?.approvals?.require_hotfix_label);
const requireMerged = Boolean(policy?.approvals?.require_merged_pr);

const resolvedCommits = [];
for (const commit of commits) {
  const resolved = runGit(`git rev-parse "${commit}^{commit}"`);
  resolvedCommits.push(resolved);

  const parentLine = runGit(`git rev-list --parents -n 1 ${resolved}`);
  const parentCount = parentLine.split(' ').length - 1;
  if (parentCount > 1 && !allowMergeCommits) {
    fail(`Merge commit not allowed in hotfix selection: ${resolved}`);
  }

  const reachable = allowedBranches.some(branch => {
    try {
      runGit(`git merge-base --is-ancestor ${resolved} ${branch}`);
      return true;
    } catch (error) {
      return false;
    }
  });

  if (!reachable) {
    fail(`Commit ${resolved} is not reachable from allowed branches: ${allowedBranches.join(', ')}`);
  }

  const filesChanged = runGit(`git diff-tree --no-commit-id --name-only -r ${resolved}`)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  for (const file of filesChanged) {
    if (isForbiddenPath(file, forbiddenPatterns, allowedPatterns)) {
      fail(`Commit ${resolved} touches forbidden path: ${file}`);
    }
  }

  if (requireApproval && approvalLabel) {
    verifyApprovalLabel(resolved, approvalLabel, requireMerged);
  }
}

const baseCommit = runGit(`git rev-parse "${baseTag}^{commit}"`);

const summary = {
  version: '1.0.0',
  policy: {
    path: values.policy,
    required_checks_policy: policy.required_checks_policy,
    approvals: policy.approvals,
    allowed_source_branches: allowedBranches,
    allowed_merge_commits: allowMergeCommits,
  },
  actor: values.actor || null,
  base_tag: baseTag,
  base_commit: baseCommit,
  target_version: targetParsed.normalized,
  branch_name: branchName,
  selected_commits: resolvedCommits,
  generated_at: new Date().toISOString(),
};

const output = stableStringify(summary);
if (values.output) {
  writeFileSync(values.output, output, 'utf-8');
} else {
  process.stdout.write(output);
}
