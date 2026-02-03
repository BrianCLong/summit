#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeysDeep(value[key]);
    }
    return out;
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}

function normalizeContexts(contexts) {
  if (!Array.isArray(contexts)) return [];
  const cleaned = contexts
    .filter(value => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned)).sort();
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing JSON file: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

function normalizePolicy(policy) {
  if (!policy || typeof policy !== 'object') {
    fail('Policy must be a JSON object.');
  }
  if (typeof policy.branch !== 'string' || policy.branch.trim().length === 0) {
    fail('Policy branch must be a non-empty string.');
  }
  if (typeof policy.enforce_admins !== 'boolean') {
    fail('Policy enforce_admins must be boolean.');
  }
  if (!policy.required_status_checks || typeof policy.required_status_checks !== 'object') {
    fail('Policy required_status_checks must be an object.');
  }
  const contexts = normalizeContexts(policy.required_status_checks.contexts);
  if (contexts.length === 0) {
    fail('Policy required_status_checks.contexts must include at least one context.');
  }
  if (typeof policy.required_status_checks.strict !== 'boolean') {
    fail('Policy required_status_checks.strict must be boolean.');
  }
  const reviews = policy.required_pull_request_reviews || {};
  if (typeof reviews.dismiss_stale_reviews !== 'boolean') {
    fail('Policy required_pull_request_reviews.dismiss_stale_reviews must be boolean.');
  }
  if (typeof reviews.require_code_owner_reviews !== 'boolean') {
    fail('Policy required_pull_request_reviews.require_code_owner_reviews must be boolean.');
  }
  if (typeof reviews.required_approving_review_count !== 'number') {
    fail('Policy required_pull_request_reviews.required_approving_review_count must be number.');
  }
  return {
    branch: policy.branch.trim(),
    enforce_admins: policy.enforce_admins,
    required_status_checks: {
      strict: policy.required_status_checks.strict,
      contexts
    },
    required_pull_request_reviews: {
      dismiss_stale_reviews: reviews.dismiss_stale_reviews,
      require_code_owner_reviews: reviews.require_code_owner_reviews,
      required_approving_review_count: reviews.required_approving_review_count
    }
  };
}

function normalizeLive(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return {
      enforce_admins: null,
      required_status_checks: { strict: null, contexts: [] },
      required_pull_request_reviews: {
        dismiss_stale_reviews: null,
        require_code_owner_reviews: null,
        required_approving_review_count: null
      }
    };
  }
  const enforceAdmins =
    typeof snapshot.enforce_admins === 'boolean'
      ? snapshot.enforce_admins
      : snapshot.enforce_admins && typeof snapshot.enforce_admins.enabled === 'boolean'
        ? snapshot.enforce_admins.enabled
        : null;

  const requiredStatus = snapshot.required_status_checks || {};
  const contexts = normalizeContexts([
    ...(Array.isArray(requiredStatus.contexts) ? requiredStatus.contexts : []),
    ...(Array.isArray(requiredStatus.checks)
      ? requiredStatus.checks
          .map(check => (check && typeof check.context === 'string' ? check.context : null))
          .filter(Boolean)
      : [])
  ]);

  const reviews = snapshot.required_pull_request_reviews || {};

  return {
    enforce_admins: enforceAdmins,
    required_status_checks: {
      strict: typeof requiredStatus.strict === 'boolean' ? requiredStatus.strict : null,
      contexts
    },
    required_pull_request_reviews: {
      dismiss_stale_reviews:
        typeof reviews.dismiss_stale_reviews === 'boolean' ? reviews.dismiss_stale_reviews : null,
      require_code_owner_reviews:
        typeof reviews.require_code_owner_reviews === 'boolean'
          ? reviews.require_code_owner_reviews
          : null,
      required_approving_review_count:
        typeof reviews.required_approving_review_count === 'number'
          ? reviews.required_approving_review_count
          : null
    }
  };
}

function computeDrift(policy, live) {
  const missingContexts = policy.required_status_checks.contexts.filter(
    context => !live.required_status_checks.contexts.includes(context)
  );
  const extraContexts = live.required_status_checks.contexts.filter(
    context => !policy.required_status_checks.contexts.includes(context)
  );

  const reviewMismatches = [];
  const reviewKeys = [
    'dismiss_stale_reviews',
    'require_code_owner_reviews',
    'required_approving_review_count'
  ];
  for (const key of reviewKeys) {
    if (policy.required_pull_request_reviews[key] !== live.required_pull_request_reviews[key]) {
      reviewMismatches.push(key);
    }
  }

  return {
    missing_contexts: missingContexts,
    extra_contexts: extraContexts,
    strict_mismatch: policy.required_status_checks.strict !== live.required_status_checks.strict,
    enforce_admins_mismatch: policy.enforce_admins !== live.enforce_admins,
    review_mismatches: reviewMismatches
  };
}

function writeEvidence(dir, report, metrics, stamp) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'report.json'), stableJson(report));
  fs.writeFileSync(path.join(dir, 'metrics.json'), stableJson(metrics));
  fs.writeFileSync(path.join(dir, 'stamp.json'), stableJson(stamp));
}

const policyPath = process.env.BPAC_POLICY_PATH ?? '.github/governance/branch_protection_rules.json';
const livePath = process.env.BPAC_LIVE_SNAPSHOT ?? '.tmp/branch_protection_live.json';
const evidenceDir = process.env.BPAC_EVIDENCE_DIR ?? 'evidence/bpac/EVD-BPAC-GOV-001';

const policyRaw = readJson(policyPath);
const liveRaw = readJson(livePath);

const policy = normalizePolicy(policyRaw);
const live = normalizeLive(liveRaw);
const drift = computeDrift(policy, live);

const driftDetected =
  drift.missing_contexts.length > 0 ||
  drift.extra_contexts.length > 0 ||
  drift.strict_mismatch ||
  drift.enforce_admins_mismatch ||
  drift.review_mismatches.length > 0;

const report = {
  evidence_id: 'EVD-BPAC-GOV-001',
  summary: driftDetected
    ? 'Branch protection drift detected against policy.'
    : 'Branch protection matches policy.',
  claims: ['SUMMIT_ORIGINAL'],
  decisions: [driftDetected ? 'deny-by-default' : 'allow'],
  details: {
    policy_path: policyPath,
    live_snapshot_path: livePath,
    policy,
    live,
    drift
  }
};

const metrics = {
  evidence_id: 'EVD-BPAC-GOV-001',
  metrics: {
    missing_contexts_count: drift.missing_contexts.length,
    extra_contexts_count: drift.extra_contexts.length,
    strict_mismatch: drift.strict_mismatch ? 1 : 0,
    enforce_admins_mismatch: drift.enforce_admins_mismatch ? 1 : 0,
    review_mismatches_count: drift.review_mismatches.length,
    drift_detected: driftDetected ? 1 : 0,
    compare_ms: 0,
    total_ms: 0
  }
};

const stamp = {
  evidence_id: 'EVD-BPAC-GOV-001',
  tool: 'verify_branch_protection',
  version: '1.0.0',
  timestamp: new Date().toISOString()
};

writeEvidence(evidenceDir, report, metrics, stamp);

if (driftDetected) {
  fail('Branch protection drift detected.');
}

console.log('Branch protection matches policy.');
