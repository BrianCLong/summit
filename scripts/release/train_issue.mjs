import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

function loadPolicy(policyPath) {
  const raw = fs.readFileSync(policyPath, 'utf8');
  return yaml.load(raw);
}

function parseRepo() {
  const repo = process.env.GITHUB_REPOSITORY || '';
  const [owner, name] = repo.split('/');
  return { owner, name, repo };
}

async function fetchJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, status: response.status, message: text };
  }

  const data = await response.json();
  return { ok: true, data };
}

function buildIssueBody({ audit, policy }) {
  const timestamp = new Date().toISOString();
  const summary = audit.safe ? '✅ SAFE' : '❌ NOT SAFE';
  const reasons = audit.reasons.length
    ? audit.reasons.map((reason) => `- ${reason}`).join('\n')
    : '- None';

  return `## Release Train Readiness\n\n**Status:** ${summary}\n**Generated:** ${timestamp}\n\n### Decision Reasons\n${reasons}\n\n### Required Checks\n${audit.required_check_status.statuses
    .map((status) => `- ${status.name}: ${status.conclusion}`)
    .join('\n')}
\n### Branch Protection Drift\n- Missing: ${audit.drift.missingInBranchProtection.join(', ') || 'None'}\n- Extra: ${audit.drift.extraInBranchProtection.join(', ') || 'None'}\n\n### Soft Gate Findings\n${audit.soft_gates.length
    ? audit.soft_gates
        .map((item) => `- ${item.file}:${item.line} (${item.pattern})`)
        .join('\n')
    : '- None detected'}\n\n### Dependency Diff Summary\n- Dependency file changes in last commit: ${audit.dependency_diff.total}\n\n---\n\n*Summit Readiness Assertion: docs/SUMMIT_READINESS_ASSERTION.md*\n*Policy source: ${policy.train_pr.required_check_policy}*\n`;
}

async function upsertIssue({ token, owner, name, title, labels, body }) {
  const listUrl = `https://api.github.com/repos/${owner}/${name}/issues?state=open&labels=${encodeURIComponent(
    labels.join(',')
  )}&per_page=100`;
  const listResponse = await fetchJson(listUrl, token);

  if (!listResponse.ok) {
    throw new Error(`Unable to list issues: ${listResponse.status}`);
  }

  const existing = listResponse.data.find((issue) => issue.title === title);

  if (existing) {
    const updateUrl = `https://api.github.com/repos/${owner}/${name}/issues/${existing.number}`;
    const updateResponse = await fetchJson(updateUrl, token, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    });

    if (!updateResponse.ok) {
      throw new Error(`Unable to update issue: ${updateResponse.status}`);
    }

    return { action: 'updated', number: existing.number, url: existing.html_url };
  }

  const createUrl = `https://api.github.com/repos/${owner}/${name}/issues`;
  const createResponse = await fetchJson(createUrl, token, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels }),
  });

  if (!createResponse.ok) {
    throw new Error(`Unable to create issue: ${createResponse.status}`);
  }

  return {
    action: 'created',
    number: createResponse.data.number,
    url: createResponse.data.html_url,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const auditIndex = args.indexOf('--audit');
  const policyIndex = args.indexOf('--policy');

  const auditPath =
    auditIndex >= 0 && args[auditIndex + 1]
      ? args[auditIndex + 1]
      : path.join(REPO_ROOT, 'dist/release-train/train-audit.json');
  const policyPath =
    policyIndex >= 0 && args[policyIndex + 1]
      ? args[policyIndex + 1]
      : path.join(REPO_ROOT, 'release/TRAIN_POLICY.yml');

  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  const policy = loadPolicy(policyPath);

  const token = process.env.GITHUB_TOKEN || '';
  const { owner, name } = parseRepo();

  if (!token || !owner || !name) {
    throw new Error('Missing GitHub token or repository context.');
  }

  const title = policy.train_pr.summary_issue_title;
  const labels = policy.labels || [];
  const body = buildIssueBody({ audit, policy });

  const result = await upsertIssue({ token, owner, name, title, labels, body });
  console.log(`Release train issue ${result.action}: ${result.url}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
