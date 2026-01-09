import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

const DEFAULT_POLICY_PATH = path.join(
  REPO_ROOT,
  'docs/ci/REQUIRED_CHECKS_POLICY.yml'
);
const DEFAULT_WORKFLOWS_DIR = path.join(REPO_ROOT, '.github/workflows');
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, 'dist/release-train');

export function loadYamlFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return yaml.load(raw);
}

export function getRequiredChecks(policy) {
  const alwaysRequired = policy?.always_required ?? [];
  return alwaysRequired.map((entry) => entry.name).filter(Boolean);
}

export function listWorkflowFiles(workflowsDir) {
  if (!fs.existsSync(workflowsDir)) {
    return [];
  }
  return fs
    .readdirSync(workflowsDir)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .map((file) => path.join(workflowsDir, file));
}

export function validateWorkflowYaml(files) {
  const errors = [];
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    try {
      yaml.load(raw);
    } catch (error) {
      errors.push({
        file: path.relative(REPO_ROOT, file),
        message: error.message,
      });
    }
  }
  return errors;
}

export function scanSoftGates(files) {
  const findings = [];
  const continueOnErrorPattern = /continue-on-error\s*:\s*true/i;
  const skipPattern = /^\s*if:\s*.*\bskip\b.*$/i;

  for (const file of files) {
    const relative = path.relative(REPO_ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (continueOnErrorPattern.test(line)) {
        findings.push({
          file: relative,
          line: index + 1,
          pattern: 'continue-on-error: true',
        });
      }
      if (skipPattern.test(line)) {
        findings.push({
          file: relative,
          line: index + 1,
          pattern: 'skip flag in if condition',
        });
      }
    });
  }

  return findings;
}

export function summarizeDependencyDiff(repoRoot) {
  const diffOutput = execSync('git diff --name-only HEAD~1..HEAD', {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();

  if (!diffOutput) {
    return { total: 0, files: [] };
  }

  const dependencyFiles = [
    'package.json',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'requirements.txt',
    'requirements.in',
    'Pipfile',
    'Pipfile.lock',
  ];

  const files = diffOutput
    .split('\n')
    .filter((file) =>
      dependencyFiles.some((dep) => file === dep || file.endsWith(`/${dep}`))
    );

  return { total: files.length, files };
}

function parseRepo() {
  const repo = process.env.GITHUB_REPOSITORY || '';
  const [owner, name] = repo.split('/');
  return { owner, name, repo };
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, status: response.status, message: text };
  }

  const data = await response.json();
  return { ok: true, data };
}

export async function fetchBranchProtection({ token, owner, name, branch }) {
  if (!token || !owner || !name) {
    return {
      accessible: false,
      error: 'Missing GitHub token or repository context.',
      requiredChecks: [],
    };
  }

  const url = `https://api.github.com/repos/${owner}/${name}/branches/${branch}/protection/required_status_checks`;
  const response = await fetchJson(url, token);

  if (!response.ok) {
    return {
      accessible: false,
      error: `GitHub API error ${response.status}: ${response.message}`,
      requiredChecks: [],
    };
  }

  const contexts = response.data.contexts ?? [];
  const checks = response.data.checks ?? [];
  const checkNames = checks.map((check) => check.context).filter(Boolean);

  return {
    accessible: true,
    error: null,
    requiredChecks: contexts.length > 0 ? contexts : checkNames,
  };
}

export async function fetchCheckRuns({ token, owner, name, sha }) {
  if (!token || !owner || !name || !sha) {
    return {
      accessible: false,
      error: 'Missing GitHub token or commit SHA.',
      checkRuns: [],
    };
  }

  const url = `https://api.github.com/repos/${owner}/${name}/commits/${sha}/check-runs?per_page=100`;
  const response = await fetchJson(url, token);

  if (!response.ok) {
    return {
      accessible: false,
      error: `GitHub API error ${response.status}: ${response.message}`,
      checkRuns: [],
    };
  }

  return {
    accessible: true,
    error: null,
    checkRuns: response.data.check_runs ?? [],
  };
}

export function evaluateRequiredChecks(requiredChecks, checkRuns) {
  const statusMap = new Map();
  for (const run of checkRuns) {
    statusMap.set(run.name, run);
  }

  const statuses = requiredChecks.map((name) => {
    const run = statusMap.get(name);
    if (!run) {
      return { name, status: 'missing', conclusion: null };
    }
    return {
      name,
      status: run.status ?? 'unknown',
      conclusion: run.conclusion ?? 'unknown',
    };
  });

  const failing = statuses.filter((status) => status.conclusion !== 'success');
  const missing = statuses.filter((status) => status.status === 'missing');

  return {
    statuses,
    passing: failing.length === 0 && missing.length === 0,
    failing,
  };
}

export function buildAuditReport({
  repo,
  branch,
  headSha,
  requiredChecks,
  branchProtection,
  requiredCheckStatus,
  softGates,
  workflowLintErrors,
  dependencyDiff,
}) {
  const drift = branchProtection.accessible
    ? {
        missingInBranchProtection: requiredChecks.filter(
          (check) => !branchProtection.requiredChecks.includes(check)
        ),
        extraInBranchProtection: branchProtection.requiredChecks.filter(
          (check) => !requiredChecks.includes(check)
        ),
      }
    : {
        missingInBranchProtection: requiredChecks,
        extraInBranchProtection: [],
      };

  const driftDetected =
    drift.missingInBranchProtection.length > 0 ||
    drift.extraInBranchProtection.length > 0 ||
    !branchProtection.accessible;

  const safe =
    requiredCheckStatus.passing &&
    workflowLintErrors.length === 0 &&
    softGates.length === 0 &&
    !driftDetected;

  const reasons = [];
  if (!requiredCheckStatus.passing) {
    reasons.push('Required checks are not all green.');
  }
  if (workflowLintErrors.length > 0) {
    reasons.push('Workflow YAML validation errors detected.');
  }
  if (softGates.length > 0) {
    reasons.push('Soft gates detected in workflows.');
  }
  if (driftDetected) {
    reasons.push('Branch protection drift detected or API unavailable.');
  }

  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    repository: repo,
    branch,
    head_sha: headSha,
    safe,
    reasons,
    required_checks: requiredChecks,
    required_check_status: requiredCheckStatus,
    branch_protection: branchProtection,
    drift,
    soft_gates: softGates,
    workflow_lint_errors: workflowLintErrors,
    dependency_diff: dependencyDiff,
  };
}

export function renderMarkdown(report) {
  const safeBadge = report.safe ? '✅ SAFE' : '❌ NOT SAFE';
  const driftBadge =
    report.drift.missingInBranchProtection.length === 0 &&
    report.drift.extraInBranchProtection.length === 0 &&
    report.branch_protection.accessible
      ? '✅ No drift'
      : '❌ Drift detected';

  const reasonLines = report.reasons.length
    ? report.reasons.map((reason) => `- ${reason}`).join('\n')
    : '- None';

  const requiredStatusLines = report.required_check_status.statuses
    .map((status) =>
      `- ${status.name}: ${status.conclusion ?? status.status}`.trim()
    )
    .join('\n');

  const softGateLines = report.soft_gates.length
    ? report.soft_gates
        .map(
          (item) => `- ${item.file}:${item.line} (${item.pattern})`
        )
        .join('\n')
    : '- None detected';

  const workflowErrors = report.workflow_lint_errors.length
    ? report.workflow_lint_errors
        .map((item) => `- ${item.file}: ${item.message}`)
        .join('\n')
    : '- None';

  const dependencyFiles = report.dependency_diff.files.length
    ? report.dependency_diff.files.map((file) => `- ${file}`).join('\n')
    : '- None in last commit';

  const driftMissing = report.drift.missingInBranchProtection.length
    ? report.drift.missingInBranchProtection.map((item) => `- ${item}`).join('\n')
    : '- None';

  const driftExtra = report.drift.extraInBranchProtection.length
    ? report.drift.extraInBranchProtection.map((item) => `- ${item}`).join('\n')
    : '- None';

  return `# Release Train Audit\n\n**Status:** ${safeBadge}\n\n**Repository:** ${report.repository || 'unknown'}\n**Branch:** ${report.branch}\n**Head SHA:** ${report.head_sha}\n**Generated:** ${report.generated_at}\n\n---\n\n## Decision Reasons\n${reasonLines}\n\n---\n\n## Required Checks\n${requiredStatusLines || '- None'}\n\n---\n\n## Branch Protection Drift\n**Status:** ${driftBadge}\n\n**Missing in branch protection:**\n${driftMissing}\n\n**Extra in branch protection:**\n${driftExtra}\n\n---\n\n## Soft Gate Findings\n${softGateLines}\n\n---\n\n## Workflow YAML Validation\n${workflowErrors}\n\n---\n\n## Dependency Diff Summary (last commit)\n**Total dependency file changes:** ${report.dependency_diff.total}\n${dependencyFiles}\n\n---\n\n*Summit Readiness Assertion: docs/SUMMIT_READINESS_ASSERTION.md*\n`;
}

export async function runAudit({
  policyPath = DEFAULT_POLICY_PATH,
  workflowsDir = DEFAULT_WORKFLOWS_DIR,
  outputDir = DEFAULT_OUTPUT_DIR,
  branch = 'main',
} = {}) {
  const policy = loadYamlFile(policyPath);
  const requiredChecks = getRequiredChecks(policy);
  const workflowFiles = listWorkflowFiles(workflowsDir);

  const workflowLintErrors = validateWorkflowYaml(workflowFiles);
  const softGates = scanSoftGates(workflowFiles);

  const dependencyDiff = summarizeDependencyDiff(REPO_ROOT);
  const headSha = execSync('git rev-parse HEAD', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();

  const token = process.env.GITHUB_TOKEN || '';
  const { owner, name, repo } = parseRepo();

  const branchProtection = await fetchBranchProtection({
    token,
    owner,
    name,
    branch,
  });

  const checkRunsResponse = await fetchCheckRuns({
    token,
    owner,
    name,
    sha: headSha,
  });

  const requiredCheckStatus = checkRunsResponse.accessible
    ? evaluateRequiredChecks(requiredChecks, checkRunsResponse.checkRuns)
    : {
        statuses: requiredChecks.map((name) => ({
          name,
          status: 'missing',
          conclusion: 'missing',
        })),
        passing: false,
        failing: requiredChecks.map((name) => ({
          name,
          status: 'missing',
          conclusion: 'missing',
        })),
      };

  const report = buildAuditReport({
    repo,
    branch,
    headSha,
    requiredChecks,
    branchProtection,
    requiredCheckStatus,
    softGates,
    workflowLintErrors,
    dependencyDiff,
  });

  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'train-audit.json');
  const mdPath = path.join(outputDir, 'train-audit.md');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, renderMarkdown(report));

  return { report, jsonPath, mdPath };
}

async function main() {
  await runAudit();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
