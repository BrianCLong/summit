import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  computeDiff,
  fetchRequiredStatusChecks,
  GitHubApiError,
  hashObject,
  inferRepoFromGit,
  loadPolicy,
  stableJson
} from './lib/branch-protection.mjs';
import { compareByCodeUnit, writeDeterministicJson } from './lib/governance_evidence.mjs';

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
    if (current === '--out') {
      args.out = argv[++i];
      continue;
    }
    if (current.startsWith('--out=')) {
      args.out = current.split('=')[1];
      continue;
    }
    if (current === '--help') {
      args.help = true;
      continue;
    }
    if (current === '--offline') {
      args.offline = true;
      continue;
    }
    throw new Error(`Unknown arg: ${current}`);
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
  console.log('  --out path            Output directory (default: artifacts/governance/branch-protection-drift)');
  console.log('  --offline             Emit unverifiable evidence without API calls');
}

function writeReportFiles(outDir, report, markdown, stamp) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'drift.json'), stableJson(report));
  writeFileSync(resolve(outDir, 'drift.md'), `${markdown}\n`);
  writeFileSync(resolve(outDir, 'stamp.json'), stableJson(stamp));
}

function writeErrorEvidence(evidencePath, branch, code) {
  const evidence = {
    schema_version: 1,
    kind: 'branch_protection_audit',
    target_branch: branch,
    state: 'UNVERIFIABLE_ERROR',
    error: {
      code,
      http_status: null
    }
  };
  writeDeterministicJson(evidencePath, evidence);
}

function formatMarkdown(report, diff, remediationCommand, errorMessage) {
  const lines = [];
  lines.push('# Branch Protection Drift Report');
  lines.push('');
  lines.push(`Repository: ${report.repo}`);
  lines.push(`Branch: ${report.branch}`);
  lines.push(`Status: ${report.status}`);
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
  lines.push(`- Required contexts (policy): ${report.policy.required_contexts.length}`);
  lines.push(`- Required contexts (GitHub): ${report.actual.required_contexts.length}`);
  lines.push(`- Missing in GitHub: ${diff.missing_in_github.length}`);
  lines.push(`- Extra in GitHub: ${diff.extra_in_github.length}`);
  lines.push(`- Strict mismatch: ${diff.strict_mismatch ? 'true' : 'false'}`);
  lines.push('');

  if (diff.missing_in_github.length > 0) {
    lines.push('## Missing in GitHub');
    lines.push('');
    for (const context of diff.missing_in_github) {
      lines.push(`- \`${context}\``);
    }
    lines.push('');
  }

  if (diff.extra_in_github.length > 0) {
    lines.push('## Extra in GitHub');
    lines.push('');
    for (const context of diff.extra_in_github) {
      lines.push(`- \`${context}\``);
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
  const outDir = args.out ?? 'artifacts/governance/branch-protection-drift';
  const evidencePath = 'artifacts/governance/branch-protection-audit.evidence.json';

  let policy;
  let repo = args.repo ?? process.env.GITHUB_REPOSITORY;
  const branch = args.branch ?? 'main';

  try {
    policy = loadPolicy(policyPath);
  } catch (error) {
    const errorMessage = `Policy error: ${error.message}`;
    const report = {
      repo: repo ?? 'unknown',
      branch,
      status: 'failed',
      policy_path: policyPath,
      error: errorMessage
    };
    const stamp = {
      timestamp: new Date().toISOString(),
      repo: report.repo,
      branch: report.branch,
      status: 'failed',
      policy_hash: null,
      actual_hash: null
    };
    const remediationCommand = `pnpm ci:branch-protection:check -- --policy ${policyPath}`;
    const markdown = formatMarkdown(report, { missing_in_github: [], extra_in_github: [], strict_mismatch: false }, remediationCommand, errorMessage);
    writeReportFiles(outDir, report, markdown, stamp);
    writeErrorEvidence(evidencePath, branch, 'POLICY_ERROR');
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
      error: errorMessage
    };
    const stamp = {
      timestamp: new Date().toISOString(),
      repo: report.repo,
      branch: report.branch,
      status: 'failed',
      policy_hash: hashObject(policy.required_status_checks),
      actual_hash: null
    };
    const remediationCommand = `pnpm ci:branch-protection:check -- --branch ${policy.branch} --policy ${policyPath}`;
    const markdown = formatMarkdown(report, { missing_in_github: [], extra_in_github: [], strict_mismatch: false }, remediationCommand, errorMessage);
    writeReportFiles(outDir, report, markdown, stamp);
    writeErrorEvidence(evidencePath, branch, 'POLICY_BRANCH_MISMATCH');
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
      error: errorMessage
    };
    const stamp = {
      timestamp: new Date().toISOString(),
      repo: report.repo,
      branch: report.branch,
      status: 'failed',
      policy_hash: hashObject(policy.required_status_checks),
      actual_hash: null
    };
    const remediationCommand = `pnpm ci:branch-protection:check -- --repo owner/name --branch ${branch} --policy ${policyPath}`;
    const markdown = formatMarkdown(report, { missing_in_github: [], extra_in_github: [], strict_mismatch: false }, remediationCommand, errorMessage);
    writeReportFiles(outDir, report, markdown, stamp);
    writeErrorEvidence(evidencePath, branch, 'REPO_UNRESOLVED');
    console.error(errorMessage);
    process.exit(2);
  }

  if (args.offline) {
    const evidence = {
      schema_version: 1,
      kind: 'branch_protection_audit',
      target_branch: branch,
      state: 'UNVERIFIABLE_PERMISSIONS',
      error: {
        code: 'MISSING_TOKEN',
        http_status: null
      }
    };
    writeDeterministicJson(evidencePath, evidence);
    console.log('Branch protection audit skipped (offline).');
    process.exit(0);
  }

  let actual;
  try {
    actual = await fetchRequiredStatusChecks({ repo, branch });
  } catch (error) {
    const isApiError = error instanceof GitHubApiError;
    const kind = isApiError ? error.kind : 'unknown';
    const errorState = kind === 'permission'
      ? 'UNVERIFIABLE_PERMISSIONS'
      : kind === 'rate_limited'
        ? 'UNVERIFIABLE_RATE_LIMIT'
        : 'UNVERIFIABLE_ERROR';
    const errorMessage = `GitHub API error: ${error.message}`;
    const report = {
      repo,
      branch,
      status: 'failed',
      policy_path: policyPath,
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
    const remediationCommand = `pnpm ci:branch-protection:check -- --repo ${repo} --branch ${branch} --policy ${policyPath}`;
    const markdown = formatMarkdown(report, { missing_in_github: [], extra_in_github: [], strict_mismatch: false }, remediationCommand, errorMessage);
    writeReportFiles(outDir, report, markdown, stamp);
    const evidence = {
      schema_version: 1,
      kind: 'branch_protection_audit',
      target_branch: branch,
      state: errorState,
      error: {
        code: kind,
        http_status: isApiError ? error.status : null
      }
    };
    writeDeterministicJson(evidencePath, evidence);
    console.error(errorMessage);
    process.exit(errorState === 'UNVERIFIABLE_PERMISSIONS' || errorState === 'UNVERIFIABLE_RATE_LIMIT' ? 0 : 2);
  }

  const diff = computeDiff(policy, actual);
  const driftDetected = diff.missing_in_github.length > 0 || diff.extra_in_github.length > 0 || diff.strict_mismatch;
  const status = driftDetected ? 'failed' : 'passed';

  const report = {
    repo,
    branch,
    status,
    policy_path: policyPath,
    policy: {
      required_contexts: policy.required_status_checks.required_contexts,
      strict: policy.required_status_checks.strict
    },
    actual: {
      required_contexts: actual.required_contexts,
      strict: actual.strict,
      source: actual.source
    },
    diff
  };

  const stamp = {
    timestamp: new Date().toISOString(),
    repo,
    branch,
    status,
    policy_hash: hashObject(policy.required_status_checks),
    actual_hash: hashObject({ required_contexts: actual.required_contexts, strict: actual.strict })
  };

  const remediationCommand = `ALLOW_BRANCH_PROTECTION_CHANGES=1 pnpm ci:branch-protection:apply -- --repo ${repo} --branch ${branch} --policy ${policyPath}`;
  const markdown = formatMarkdown(report, diff, remediationCommand);

  writeReportFiles(outDir, report, markdown, stamp);
  const evidence = {
    schema_version: 1,
    kind: 'branch_protection_audit',
    target_branch: branch,
    state: driftDetected ? 'VERIFIED_DRIFT' : 'VERIFIED_MATCH'
  };
  if (driftDetected) {
    evidence.diff = {
      missing_in_github: diff.missing_in_github.slice().sort(compareByCodeUnit),
      extra_in_github: diff.extra_in_github.slice().sort(compareByCodeUnit),
      strict_mismatch: diff.strict_mismatch
    };
  }
  writeDeterministicJson(evidencePath, evidence);

  if (driftDetected) {
    console.error('Branch protection drift detected. See drift.md for details.');
    process.exit(1);
  }

  console.log('Branch protection matches policy.');
  process.exit(0);
}

main().catch(error => {
  console.error(`Unexpected error: ${error.message}`);
  process.exit(2);
});
