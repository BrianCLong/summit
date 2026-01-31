import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadPolicy, stableJson } from './lib/branch-protection.mjs';

function parseArgs(argv) {
  const args = {
    reviewCount: 2,
    requireCodeOwnerReview: true,
    dismissStaleReviews: true,
    requireConversationResolution: true,
    enforceAdmins: false,
    requireSignedCommits: true,
    requireLinearHistory: false,
    allowForcePushes: false,
    allowDeletions: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--') {
      continue;
    }
    if (current === '--policy') {
      args.policy = argv[++i];
      continue;
    }
    if (current.startsWith('--policy=')) {
      args.policy = current.split('=')[1];
      continue;
    }
    if (current === '--branch') {
      args.branch = argv[++i];
      continue;
    }
    if (current.startsWith('--branch=')) {
      args.branch = current.split('=')[1];
      continue;
    }
    if (current === '--review-count') {
      args.reviewCount = Number(argv[++i]);
      continue;
    }
    if (current.startsWith('--review-count=')) {
      args.reviewCount = Number(current.split('=')[1]);
      continue;
    }
    if (current === '--require-code-owner-review') {
      args.requireCodeOwnerReview = true;
      continue;
    }
    if (current === '--no-require-code-owner-review') {
      args.requireCodeOwnerReview = false;
      continue;
    }
    if (current === '--dismiss-stale-reviews') {
      args.dismissStaleReviews = true;
      continue;
    }
    if (current === '--no-dismiss-stale-reviews') {
      args.dismissStaleReviews = false;
      continue;
    }
    if (current === '--require-conversation-resolution') {
      args.requireConversationResolution = true;
      continue;
    }
    if (current === '--no-require-conversation-resolution') {
      args.requireConversationResolution = false;
      continue;
    }
    if (current === '--enforce-admins') {
      args.enforceAdmins = true;
      continue;
    }
    if (current === '--no-enforce-admins') {
      args.enforceAdmins = false;
      continue;
    }
    if (current === '--require-signed-commits') {
      args.requireSignedCommits = true;
      continue;
    }
    if (current === '--no-require-signed-commits') {
      args.requireSignedCommits = false;
      continue;
    }
    if (current === '--require-linear-history') {
      args.requireLinearHistory = true;
      continue;
    }
    if (current === '--no-require-linear-history') {
      args.requireLinearHistory = false;
      continue;
    }
    if (current === '--allow-force-pushes') {
      args.allowForcePushes = true;
      continue;
    }
    if (current === '--no-allow-force-pushes') {
      args.allowForcePushes = false;
      continue;
    }
    if (current === '--allow-deletions') {
      args.allowDeletions = true;
      continue;
    }
    if (current === '--no-allow-deletions') {
      args.allowDeletions = false;
      continue;
    }
    if (current === '--output') {
      args.output = argv[++i];
      continue;
    }
    if (current.startsWith('--output=')) {
      args.output = current.split('=')[1];
      continue;
    }
    if (current === '--help') {
      args.help = true;
      continue;
    }
    throw new Error(`Unknown arg: ${current}`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: node scripts/ci/generate_branch_protection_payload.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --policy path                     Policy file (default: docs/ci/REQUIRED_CHECKS_POLICY.yml)');
  console.log('  --branch name                     Branch to protect (defaults to policy branch)');
  console.log('  --review-count number             Required approving review count (default: 2)');
  console.log('  --require-code-owner-review       Require code owner reviews (default: true)');
  console.log('  --dismiss-stale-reviews           Dismiss stale reviews on push (default: true)');
  console.log('  --require-conversation-resolution Require resolved conversations (default: true)');
  console.log('  --enforce-admins                  Enforce admin rules (default: false)');
  console.log('  --require-signed-commits          Require signed commits (default: true)');
  console.log('  --require-linear-history          Require linear history (default: false)');
  console.log('  --allow-force-pushes              Allow force pushes (default: false)');
  console.log('  --allow-deletions                 Allow deletions (default: false)');
  console.log('  --output path                     Write payload to file instead of stdout');
}

function buildBranchProtectionPayload({
  policyPath = 'docs/ci/REQUIRED_CHECKS_POLICY.yml',
  branchOverride,
  reviewCount = 2,
  requireCodeOwnerReview = true,
  dismissStaleReviews = true,
  requireConversationResolution = true,
  enforceAdmins = false,
  requireSignedCommits = true,
  requireLinearHistory = false,
  allowForcePushes = false,
  allowDeletions = false
} = {}) {
  const policy = loadPolicy(policyPath);
  const branch = branchOverride ?? policy.branch;

  if (branch !== policy.branch) {
    throw new Error(`Branch override ${branch} does not match policy branch ${policy.branch}.`);
  }

  if (!Number.isInteger(reviewCount) || reviewCount < 1) {
    throw new Error('review-count must be a positive integer.');
  }

  return {
    required_status_checks: {
      strict: policy.required_status_checks.strict,
      checks: policy.required_status_checks.required_contexts.map(context => ({ context }))
    },
    required_pull_request_reviews: {
      required_approving_review_count: reviewCount,
      dismiss_stale_reviews: dismissStaleReviews,
      require_code_owner_reviews: requireCodeOwnerReview
    },
    enforce_admins: enforceAdmins,
    required_conversation_resolution: requireConversationResolution,
    required_signatures: requireSignedCommits,
    required_linear_history: requireLinearHistory,
    allow_force_pushes: allowForcePushes,
    allow_deletions: allowDeletions,
    restrictions: null
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const payload = buildBranchProtectionPayload({
    policyPath: args.policy,
    branchOverride: args.branch,
    reviewCount: args.reviewCount,
    requireCodeOwnerReview: args.requireCodeOwnerReview,
    dismissStaleReviews: args.dismissStaleReviews,
    requireConversationResolution: args.requireConversationResolution,
    enforceAdmins: args.enforceAdmins,
    requireSignedCommits: args.requireSignedCommits,
    requireLinearHistory: args.requireLinearHistory,
    allowForcePushes: args.allowForcePushes,
    allowDeletions: args.allowDeletions
  });

  const output = stableJson(payload);
  if (args.output) {
    const resolved = resolve(args.output);
    writeFileSync(resolved, output, 'utf8');
    console.log(`Wrote branch protection payload to ${resolved}`);
    return;
  }

  process.stdout.write(output);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`Error: ${error.message}`);
    process.exit(2);
  });
}

export { buildBranchProtectionPayload };
