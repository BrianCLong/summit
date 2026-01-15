import {
  computeDiff,
  fetchRequiredStatusChecks,
  ghApi,
  inferRepoFromGit,
  loadPolicy
} from './lib/branch-protection.mjs';

function parseArgs(argv) {
  const args = { dryRun: true };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--') {
      continue;
    }
    if (current === '--repo') {
      args.repo = argv[++i];
      continue;
    }
    if (current.startsWith('--repo=')) {
      args.repo = current.split('=')[1];
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
    if (current === '--policy') {
      args.policy = argv[++i];
      continue;
    }
    if (current.startsWith('--policy=')) {
      args.policy = current.split('=')[1];
      continue;
    }
    if (current === '--apply') {
      args.apply = true;
      args.dryRun = false;
      continue;
    }
    if (current === '--dry-run') {
      args.dryRun = true;
      args.apply = false;
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
  console.log('Usage: node scripts/ci/apply_branch_protection_policy.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --repo owner/name     GitHub repo (defaults to GITHUB_REPOSITORY or git remote)');
  console.log('  --branch name         Branch to update (default: main)');
  console.log('  --policy path         Policy file (default: docs/ci/REQUIRED_CHECKS_POLICY.yml)');
  console.log('  --dry-run             Plan only (default)');
  console.log('  --apply               Apply changes (requires ALLOW_BRANCH_PROTECTION_CHANGES=1)');
}

function printDiff(diff) {
  if (diff.missing_in_github.length > 0) {
    console.log('Missing in GitHub:');
    for (const context of diff.missing_in_github) {
      console.log(`  - ${context}`);
    }
  }
  if (diff.extra_in_github.length > 0) {
    console.log('Extra in GitHub:');
    for (const context of diff.extra_in_github) {
      console.log(`  - ${context}`);
    }
  }
  if (diff.strict_mismatch) {
    console.log(`Strict mismatch: policy=${diff.policy_strict} github=${diff.actual_strict}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const policyPath = args.policy ?? 'docs/ci/REQUIRED_CHECKS_POLICY.yml';
  const branch = args.branch ?? 'main';
  let repo = args.repo ?? process.env.GITHUB_REPOSITORY;

  const policy = loadPolicy(policyPath);
  if (policy.branch !== branch) {
    throw new Error(`Policy branch mismatch: policy expects ${policy.branch} but --branch is ${branch}.`);
  }

  if (!repo) {
    repo = await inferRepoFromGit();
  }
  if (!repo) {
    throw new Error('Unable to infer repo. Use --repo owner/name or set GITHUB_REPOSITORY.');
  }

  const actual = await fetchRequiredStatusChecks({ repo, branch });
  const diff = computeDiff(policy, actual);
  const driftDetected = diff.missing_in_github.length > 0 || diff.extra_in_github.length > 0 || diff.strict_mismatch;

  const diffWithStrict = {
    ...diff,
    policy_strict: policy.required_status_checks.strict,
    actual_strict: actual.strict
  };

  console.log(`Repository: ${repo}`);
  console.log(`Branch: ${branch}`);
  console.log(`Policy file: ${policyPath}`);
  console.log(`Drift detected: ${driftDetected ? 'true' : 'false'}`);
  printDiff(diffWithStrict);

  if (args.dryRun) {
    console.log('Dry run complete. No changes applied.');
    process.exit(0);
  }

  if (!args.apply) {
    throw new Error('Refusing to apply without --apply flag.');
  }

  if (process.env.ALLOW_BRANCH_PROTECTION_CHANGES !== '1') {
    throw new Error('Refusing to apply without ALLOW_BRANCH_PROTECTION_CHANGES=1.');
  }

  if (!driftDetected) {
    console.log('Branch protection already matches policy. No changes needed.');
    process.exit(0);
  }

  const payload = {
    strict: policy.required_status_checks.strict,
    contexts: policy.required_status_checks.required_contexts
  };

  const endpoint = `repos/${repo}/branches/${branch}/protection/required_status_checks`;
  await ghApi(endpoint, {
    method: 'PATCH',
    input: JSON.stringify(payload)
  });

  console.log('Applied branch protection policy via GitHub API.');
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(2);
});
