#!/usr/bin/env node
import assert from 'node:assert';
import fs from 'node:fs';
import process from 'node:process';

const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  GITHUB_API_URL = 'https://api.github.com',
  BRANCH_PROTECTION_POLICY_PATH = 'docs/ci/REQUIRED_CHECKS_POLICY.yml',
  BPAC_POLICY_PATH,
  BPAC_LIVE_SNAPSHOT,
  BPAC_EVIDENCE_DIR = 'artifacts/governance/bpac',
} = process.env;

const isFixtureMode = Boolean(BPAC_POLICY_PATH && BPAC_LIVE_SNAPSHOT);
const [owner, repo] = (GITHUB_REPOSITORY || '').split('/');

function parseBranchProtectionPolicy(raw) {
  let strict = null;
  const contexts = [];
  let inBranchProtection = false;
  let inRequiredStatusChecks = false;
  let inContexts = false;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = line.search(/\S|$/);

    if (indent === 0 && !trimmed.startsWith('- ')) {
      inBranchProtection = trimmed === 'branch_protection:';
      inRequiredStatusChecks = false;
      inContexts = false;
      continue;
    }

    if (!inBranchProtection) continue;

    if (indent <= 2 && !trimmed.startsWith('- ') && trimmed !== 'required_status_checks:') {
      inRequiredStatusChecks = false;
      inContexts = false;
      continue;
    }

    if (indent === 2 && trimmed === 'required_status_checks:') {
      inRequiredStatusChecks = true;
      inContexts = false;
      continue;
    }

    if (!inRequiredStatusChecks) continue;

    if (indent === 4 && trimmed.startsWith('strict:')) {
      strict = trimmed.split(':').slice(1).join(':').trim() === 'true';
      continue;
    }

    if (indent === 4 && trimmed === 'contexts:') {
      inContexts = true;
      continue;
    }

    if (inContexts && indent <= 4 && !trimmed.startsWith('- ')) {
      inContexts = false;
    }

    if (inContexts && trimmed.startsWith('- ')) {
      const value = trimmed
        .slice(2)
        .replace(/\s+#.*$/, '')
        .replace(/^['"]|['"]$/g, '')
        .trim();
      if (value) contexts.push(value);
    }
  }

  return {
    strict,
    requiredContexts: Array.from(new Set(contexts)),
  };
}

async function getBranchProtection(branch) {
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/branches/${branch}/protection`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub API failed (${response.status}) for ${branch}`);
  }
  return response.json();
}

function sorted(values) {
  return values.slice().sort((left, right) => left.localeCompare(right));
}

function diffContexts(expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missing: sorted(expected.filter(item => !actualSet.has(item))),
    extra: sorted(actual.filter(item => !expectedSet.has(item))),
  };
}

function writeFixtureEvidence(report) {
  fs.mkdirSync(BPAC_EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(
    `${BPAC_EVIDENCE_DIR}/report.json`,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
}

function runFixtureMode() {
  const desired = JSON.parse(fs.readFileSync(BPAC_POLICY_PATH, 'utf8'));
  const live = JSON.parse(fs.readFileSync(BPAC_LIVE_SNAPSHOT, 'utf8'));
  const expectedContexts = sorted(desired?.required_status_checks?.contexts || []);
  const liveContexts = sorted(live?.required_status_checks?.contexts || []);
  const contextDiff = diffContexts(expectedContexts, liveContexts);
  const strictMismatch = Boolean(desired?.required_status_checks?.strict) !== Boolean(live?.required_status_checks?.strict);
  const enforceAdminsMismatch = Boolean(desired?.enforce_admins) !== Boolean(live?.enforce_admins?.enabled);
  const reviewCountMismatch =
    Number(desired?.required_pull_request_reviews?.required_approving_review_count || 0) !==
    Number(live?.required_pull_request_reviews?.required_approving_review_count || 0);
  const dismissStaleMismatch =
    Boolean(desired?.required_pull_request_reviews?.dismiss_stale_reviews) !==
    Boolean(live?.required_pull_request_reviews?.dismiss_stale_reviews);
  const codeOwnerMismatch =
    Boolean(desired?.required_pull_request_reviews?.require_code_owner_reviews) !==
    Boolean(live?.required_pull_request_reviews?.require_code_owner_reviews);

  const hasDrift =
    strictMismatch ||
    enforceAdminsMismatch ||
    reviewCountMismatch ||
    dismissStaleMismatch ||
    codeOwnerMismatch ||
    contextDiff.missing.length > 0 ||
    contextDiff.extra.length > 0;

  writeFixtureEvidence({
    mode: 'fixture',
    has_drift: hasDrift,
    strict_mismatch: strictMismatch,
    enforce_admins_mismatch: enforceAdminsMismatch,
    review_count_mismatch: reviewCountMismatch,
    dismiss_stale_mismatch: dismissStaleMismatch,
    code_owner_mismatch: codeOwnerMismatch,
    missing_contexts: contextDiff.missing,
    extra_contexts: contextDiff.extra,
  });

  if (hasDrift) {
    console.error('❌ Branch protection drift detected (fixture mode)');
    process.exit(1);
  }

  console.log('✅ Branch protection matches fixture policy');
  process.exit(0);
}

if (isFixtureMode) {
  runFixtureMode();
}

assert(GITHUB_TOKEN, 'GITHUB_TOKEN missing');
assert(GITHUB_REPOSITORY, 'GITHUB_REPOSITORY missing');

const rawPolicy = fs.readFileSync(BRANCH_PROTECTION_POLICY_PATH, 'utf8');
const policy = parseBranchProtectionPolicy(rawPolicy);
assert(policy.requiredContexts.length > 0, 'No required contexts found in branch protection policy');
assert(typeof policy.strict === 'boolean', 'Missing strict mode in branch protection policy');

const protection = await getBranchProtection('main');
const liveStrict = Boolean(protection?.required_status_checks?.strict);
const liveContexts = (protection?.required_status_checks?.checks || [])
  .map(item => item?.context)
  .filter(Boolean);
const diff = diffContexts(policy.requiredContexts, liveContexts);
const hasDrift = diff.missing.length > 0 || diff.extra.length > 0 || liveStrict !== policy.strict;

if (hasDrift) {
  console.error('❌ Branch protection drift detected:');
  if (liveStrict !== policy.strict) {
    console.error(` - strict mismatch: policy=${policy.strict} live=${liveStrict}`);
  }
  if (diff.missing.length > 0) {
    console.error(` - missing in GitHub: ${diff.missing.join(', ')}`);
  }
  if (diff.extra.length > 0) {
    console.error(` - extra in GitHub: ${diff.extra.join(', ')}`);
  }
  process.exit(1);
}

console.log('✅ Branch protection matches required-check policy');
