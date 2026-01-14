import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  computeDiff,
  fetchRequiredStatusChecks,
  hashObject,
  inferRepoFromGit,
  loadPolicy,
  loadExceptions,
  stableJson
} from './lib/branch-protection.mjs';

function parseArgs(argv) {
  const args = {};
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
    if (current === '--exceptions') {
      args.exceptions = argv[++i];
      continue;
    }
    if (current.startsWith('--exceptions=')) {
      args.exceptions = current.split('=')[1];
      continue;
    }
    if (current === '--out') {
      args.out = argv[++i];
      continue;
    }
    if (current === '--out-dir') { // Alias for compatibility
      args.out = argv[++i];
      continue;
    }
    if (current.startsWith('--out=')) {
      args.out = current.split('=')[1];
      continue;
    }
    if (current === '--verbose') {
      args.verbose = true;
      continue;
    }
    if (current === '--help') {
      args.help = true;
      continue;
    }
  }
  return args;
}

function printHelp() {
  console.log('Usage: node scripts/ci/check_branch_protection_drift.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --repo owner/name     GitHub repo (defaults to GITHUB_REPOSITORY or git remote)');
  console.log('  --branch name         Branch to check (default: main)');
  console.log('  --policy path         Policy file (default: docs/ci/REQUIRED_CHECKS_POLICY.yml)');
  console.log('  --exceptions path     Exceptions file (default: docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml)');
  console.log('  --out path            Output directory (default: artifacts/governance/branch-protection-drift)');
  console.log('  --verbose             Verbose logging');
}

function writeReportFiles(outDir, report, markdown, stamp) {
  mkdirSync(outDir, { recursive: true });
  // The file names must match what the workflow expects
  writeFileSync(resolve(outDir, 'branch_protection_drift_report.json'), stableJson(report));
  writeFileSync(resolve(outDir, 'drift.json'), stableJson(report)); // Alias for backward compat if needed
  writeFileSync(resolve(outDir, 'branch_protection_drift_report.md'), `${markdown}\n`);
  writeFileSync(resolve(outDir, 'drift.md'), `${markdown}\n`); // Alias
  writeFileSync(resolve(outDir, 'stamp.json'), stableJson(stamp));
}

function formatMarkdown(report, diff, remediationCommand, errorMessage) {
  const lines = [];
  lines.push('# Branch Protection Drift Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Repository:** ${report.repo}`);
  lines.push(`**Branch:** ${report.branch}`);
  lines.push(`**Policy Path:** ${report.policy_path}`);
  lines.push(`**Exceptions Loaded:** ${report.exceptions_loaded}`);
  lines.push('');

  if (errorMessage) {
    lines.push('## Error');
    lines.push('');
    lines.push('```');
    lines.push(errorMessage.trim());
    lines.push('```');
    lines.push('');
    lines.push('## Remediation');
    lines.push('');
    lines.push('Fix API access or policy issues, then rerun:');
    lines.push('');
    lines.push('```bash');
    lines.push(remediationCommand);
    lines.push('```');
    return lines.join('\n');
  }

  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Policy Check Count | ${report.summary.policy_check_count} |`);
  lines.push(`| GitHub Check Count | ${report.summary.github_check_count} |`);
  lines.push(`| Missing in GitHub | ${report.summary.missing_in_github_count} |`);
  lines.push(`| Extra in GitHub | ${report.summary.extra_in_github_count} |`);
  lines.push(`| Excepted (Missing) | ${report.summary.excepted_missing_count} |`);
  lines.push(`| Excepted (Extra) | ${report.summary.excepted_extra_count} |`);
  lines.push(`| **Drift Detected** | ${report.drift_detected} |`);
  lines.push('');

  if (diff.missing_in_github.length > 0) {
    lines.push('## Missing in GitHub');
    lines.push('');
    lines.push('These checks are required by policy but NOT enforced in GitHub branch protection:');
    lines.push('');
    for (const context of diff.missing_in_github) {
      lines.push(`- \`${context}\``);
    }
    lines.push('');
  }

  if (diff.extra_in_github.length > 0) {
    lines.push('## Extra in GitHub');
    lines.push('');
    lines.push('These checks are enforced in GitHub but NOT listed in policy:');
    lines.push('');
    for (const context of diff.extra_in_github) {
      lines.push(`- \`${context}\``);
    }
    lines.push('');
  }

  if (diff.excepted_missing && diff.excepted_missing.length > 0) {
    lines.push('## Excepted Mismatches (Intentional)');
    lines.push('');
    for (const context of diff.excepted_missing) {
      lines.push(`- \`${context}\` — allowed missing in GitHub`);
    }
    lines.push('');
  }

  if (diff.excepted_extra && diff.excepted_extra.length > 0) {
    if (!diff.excepted_missing || diff.excepted_missing.length === 0) {
       lines.push('## Excepted Mismatches (Intentional)');
       lines.push('');
    }
    for (const context of diff.excepted_extra) {
      lines.push(`- \`${context}\` — allowed extra in GitHub`);
    }
    lines.push('');
  }

  if (diff.strict_mismatch) {
    lines.push('## Strict Setting Drift');
    lines.push('');
    lines.push(`- Policy strict: ${report.policy.strict}`);
    lines.push(`- GitHub strict: ${report.actual.strict}`);
    lines.push('');
  }

  lines.push('## Remediation');
  lines.push('');

  if (diff.missing_in_github.length > 0) {
     lines.push('**Add missing checks to GitHub:**');
     lines.push('1. Go to Settings → Branches → Branch protection rules');
     lines.push(`2. Edit the rule for \`${report.branch}\``);
     lines.push('3. Add missing checks');
     lines.push('');
  }

  if (diff.extra_in_github.length > 0) {
     lines.push('**Update Policy or GitHub:**');
     lines.push('Option A: Add to policy `REQUIRED_CHECKS_POLICY.yml` (branch_protection section)');
     lines.push('Option B: Remove from GitHub branch protection');
     lines.push('');
  }

  lines.push('```bash');
  lines.push(remediationCommand);
  lines.push('```');

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const policyPath = args.policy ?? 'docs/ci/REQUIRED_CHECKS_POLICY.yml';
  const exceptionsPath = args.exceptions ?? 'docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml';
  const outDir = args.out ?? 'artifacts/governance/branch-protection-drift';

  let policy;
  let repo = args.repo ?? process.env.GITHUB_REPOSITORY;
  const branch = args.branch ?? 'main';

  // Load Policy
  try {
    policy = loadPolicy(policyPath);
  } catch (error) {
    const errorMessage = `Policy error: ${error.message}`;
    const report = {
      repo: repo ?? 'unknown',
      branch,
      status: 'failed',
      policy_path: policyPath,
      drift_detected: true, // Fail safe
      summary: {},
      error: errorMessage
    };
    const stamp = {
      timestamp: new Date().toISOString(),
      repo: report.repo,
      branch: report.branch,
      status: 'failed'
    };
    const remediationCommand = `node scripts/ci/check_branch_protection_drift.mjs --policy ${policyPath}`;
    const markdown = formatMarkdown(report, { missing_in_github: [], extra_in_github: [], strict_mismatch: false }, remediationCommand, errorMessage);
    writeReportFiles(outDir, report, markdown, stamp);
    console.error(errorMessage);
    process.exit(2);
  }

  if (policy.branch !== branch) {
    const errorMessage = `Policy branch mismatch: policy expects ${policy.branch} but --branch is ${branch}.`;
    const report = {
      repo: repo ?? 'unknown',
      branch,
      status: 'failed',
      policy_path: policyPath,
      drift_detected: true,
      summary: {},
      error: errorMessage
    };
    const stamp = {
      timestamp: new Date().toISOString(),
      repo: report.repo,
      branch: report.branch,
      status: 'failed',
    };
    const remediationCommand = `node scripts/ci/check_branch_protection_drift.mjs --branch ${policy.branch} --policy ${policyPath}`;
    const markdown = formatMarkdown(report, { missing_in_github: [], extra_in_github: [], strict_mismatch: false }, remediationCommand, errorMessage);
    writeReportFiles(outDir, report, markdown, stamp);
    console.error(errorMessage);
    process.exit(2);
  }

  if (!repo) {
    repo = await inferRepoFromGit();
  }
  if (!repo) {
    const errorMessage = 'Unable to infer repo. Use --repo owner/name or set GITHUB_REPOSITORY.';
    const report = {
      repo: 'unknown',
      branch,
      status: 'failed',
      policy_path: policyPath,
      drift_detected: true,
      summary: {},
      error: errorMessage
    };
    const stamp = {
      timestamp: new Date().toISOString(),
      repo: report.repo,
      branch: report.branch,
      status: 'failed'
    };
    const remediationCommand = `node scripts/ci/check_branch_protection_drift.mjs --repo owner/name --branch ${branch} --policy ${policyPath}`;
    const markdown = formatMarkdown(report, { missing_in_github: [], extra_in_github: [], strict_mismatch: false }, remediationCommand, errorMessage);
    writeReportFiles(outDir, report, markdown, stamp);
    console.error(errorMessage);
    process.exit(2);
  }

  // Load Exceptions
  const exceptions = loadExceptions(exceptionsPath, branch);

  // Fetch Actual
  let actual;
  try {
    actual = await fetchRequiredStatusChecks({ repo, branch });
  } catch (error) {
    const errorMessage = `GitHub API error: ${error.message}`;
    const report = {
      repo,
      branch,
      status: 'failed',
      policy_path: policyPath,
      exceptions_loaded: exceptions.loaded,
      drift_detected: true, // Assume drift if we can't check
      summary: {
        policy_check_count: policy.required_status_checks.required_contexts.length,
        github_check_count: 0,
        missing_in_github_count: 0,
        extra_in_github_count: 0,
        excepted_missing_count: 0,
        excepted_extra_count: 0
      },
      policy: {
        required_contexts: policy.required_status_checks.required_contexts,
        strict: policy.required_status_checks.strict
      },
      error: errorMessage
    };
    const stamp = {
      timestamp: new Date().toISOString(),
      repo,
      branch,
      status: 'failed',
      policy_hash: hashObject(policy.required_status_checks),
      actual_hash: null
    };
    const remediationCommand = `node scripts/ci/check_branch_protection_drift.mjs --repo ${repo} --branch ${branch} --policy ${policyPath}`;
    const markdown = formatMarkdown(report, { missing_in_github: [], extra_in_github: [], strict_mismatch: false }, remediationCommand, errorMessage);
    writeReportFiles(outDir, report, markdown, stamp);
    console.error(errorMessage);
    process.exit(2);
  }

  const diff = computeDiff(policy, actual, exceptions);
  const driftDetected = diff.missing_in_github.length > 0 || diff.extra_in_github.length > 0 || diff.strict_mismatch;
  const status = driftDetected ? 'failed' : 'passed';

  const report = {
    version: "1.1",
    generated_at: new Date().toISOString(),
    repo,
    branch,
    status,
    policy_path: policyPath,
    exceptions_path: exceptionsPath,
    exceptions_loaded: exceptions.loaded,
    drift_detected: driftDetected,
    summary: {
        policy_check_count: policy.required_status_checks.required_contexts.length,
        github_check_count: actual.required_contexts.length,
        missing_in_github_count: diff.missing_in_github.length,
        extra_in_github_count: diff.extra_in_github.length,
        excepted_missing_count: diff.excepted_missing.length,
        excepted_extra_count: diff.excepted_extra.length,
        active_exception_count: exceptions.count || 0
    },
    policy: {
      required_contexts: policy.required_status_checks.required_contexts,
      strict: policy.required_status_checks.strict
    },
    actual: {
      required_contexts: actual.required_contexts,
      strict: actual.strict,
      source: actual.source
    },
    diff, // contains missing_in_github, extra_in_github arrays
    missing_in_github: diff.missing_in_github, // top level aliases for workflow convenience if needed
    extra_in_github: diff.extra_in_github
  };

  const stamp = {
    timestamp: new Date().toISOString(),
    repo,
    branch,
    status,
    policy_hash: hashObject(policy.required_status_checks),
    actual_hash: hashObject({ required_contexts: actual.required_contexts, strict: actual.strict })
  };

  // Remediation
  const remediationCommand = `ALLOW_BRANCH_PROTECTION_CHANGES=1 pnpm ci:branch-protection:apply -- --repo ${repo} --branch ${branch} --policy ${policyPath}`;

  const markdown = formatMarkdown(report, diff, remediationCommand);

  writeReportFiles(outDir, report, markdown, stamp);

  if (driftDetected) {
    console.error('Branch protection drift detected. See branch_protection_drift_report.md for details.');
    process.exit(0); // Exit 0 to not break CI, but report drift in output.
    // Wait, the workflow checks output.drift_detected.
    // The bash script always exited 0.
  }

  console.log('Branch protection matches policy.');
  process.exit(0);
}

main().catch(error => {
  console.error(`Unexpected error: ${error.message}`);
  process.exit(2);
});
