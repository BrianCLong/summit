import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadPolicy, stableJson } from './lib/branch-protection.mjs';

function parseArgs(argv) {
  const args = {
    enforcement: 'active',
    name: 'Summit Main Branch Protection',
    reviewCount: 2
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
    if (current === '--name') {
      args.name = argv[++i];
      continue;
    }
    if (current.startsWith('--name=')) {
      args.name = current.split('=')[1];
      continue;
    }
    if (current === '--enforcement') {
      args.enforcement = argv[++i];
      continue;
    }
    if (current.startsWith('--enforcement=')) {
      args.enforcement = current.split('=')[1];
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
  console.log('Usage: node scripts/ci/generate_ruleset_payload.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --policy path          Policy file (default: docs/ci/REQUIRED_CHECKS_POLICY.yml)');
  console.log('  --branch name          Branch to protect (defaults to policy branch)');
  console.log('  --name string          Ruleset name (default: Summit Main Branch Protection)');
  console.log('  --enforcement mode     active|disabled|evaluate (default: active)');
  console.log('  --review-count number  Required approving review count (default: 2)');
  console.log('  --output path          Write payload to file instead of stdout');
}

function buildRulesetPayload({
  policyPath = 'docs/ci/REQUIRED_CHECKS_POLICY.yml',
  branchOverride,
  name = 'Summit Main Branch Protection',
  enforcement = 'active',
  reviewCount = 2
} = {}) {
  const policy = loadPolicy(policyPath);
  const branch = branchOverride ?? policy.branch;

  if (branch !== policy.branch) {
    throw new Error(`Branch override ${branch} does not match policy branch ${policy.branch}.`);
  }

  if (!Number.isInteger(reviewCount) || reviewCount < 1) {
    throw new Error('review-count must be a positive integer.');
  }

  const requiredStatusChecks = policy.required_status_checks.required_contexts.map(context => ({
    context
  }));

  return {
    name,
    target: 'branch',
    enforcement,
    conditions: {
      ref_name: {
        include: [`refs/heads/${branch}`],
        exclude: []
      }
    },
    rules: [
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: reviewCount,
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: true,
          require_last_push_approval: false,
          required_review_thread_resolution: true
        }
      },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: policy.required_status_checks.strict,
          required_status_checks: requiredStatusChecks
        }
      },
      {
        type: 'required_signatures',
        parameters: {}
      },
      {
        type: 'non_fast_forward',
        parameters: {}
      }
    ]
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const payload = buildRulesetPayload({
    policyPath: args.policy,
    branchOverride: args.branch,
    name: args.name,
    enforcement: args.enforcement,
    reviewCount: args.reviewCount
  });

  const output = stableJson(payload);
  if (args.output) {
    const resolved = resolve(args.output);
    writeFileSync(resolved, output, 'utf8');
    console.log(`Wrote ruleset payload to ${resolved}`);
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

export { buildRulesetPayload };
