import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

function run(command, options = {}) {
  execSync(command, { cwd: REPO_ROOT, stdio: 'inherit', ...options });
}

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

export function selectTrainPullRequest(pulls, label) {
  const matching = pulls.filter((pull) =>
    pull.labels?.some((item) => item.name === label)
  );

  if (matching.length > 1) {
    return { status: 'multiple', pulls: matching };
  }

  if (matching.length === 1) {
    return { status: 'found', pull: matching[0] };
  }

  return { status: 'none' };
}

function withinAllowedWindow(policy) {
  const windows = policy.allowed_windows || [];
  if (windows.length === 0) {
    return { allowed: true, reason: 'No window restrictions configured.' };
  }

  const now = new Date();
  const day = now
    .toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
    .slice(0, 3);
  const time = now.toISOString().slice(11, 16);

  const allowed = windows.some((window) => {
    if (!window.days?.includes(day)) {
      return false;
    }
    return time >= window.start && time <= window.end;
  });

  return {
    allowed,
    reason: allowed ? 'Within allowed window.' : 'Outside allowed window.',
  };
}

function listDiffFiles() {
  const output = execSync('git diff --name-only', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
  return output ? output.split('\n').filter(Boolean) : [];
}

function listNewDiffFiles(previous) {
  const current = new Set(listDiffFiles());
  const delta = [...current].filter((file) => !previous.has(file));
  return { current, delta };
}

function applyChangeSet(changeSet, history) {
  if (!changeSet.enabled) {
    return;
  }

  for (const command of changeSet.commands || []) {
    run(command);
  }

  const { current, delta } = listNewDiffFiles(history.current);
  history.current = current;
  history.changes.push({
    id: changeSet.id,
    description: changeSet.description,
    files: delta,
  });
}

function applyChangeSets(policy) {
  const allowedChanges = policy.train_pr.allowed_changes || {};
  const history = { current: new Set(listDiffFiles()), changes: [] };

  Object.entries(allowedChanges).forEach(([id, config]) => {
    applyChangeSet({ id, ...config }, history);
  });

  return history.changes;
}

function configureGitIdentity() {
  run('git config user.name "release-train-bot"');
  run('git config user.email "release-train-bot@users.noreply.github.com"');
}

function ensureBranch(branch) {
  run('git fetch origin');
  const branches = execSync('git branch --list', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  if (!branches.includes(branch)) {
    run(`git checkout -b ${branch} origin/main`);
  } else {
    run(`git checkout ${branch}`);
    run('git reset --hard origin/main');
  }
}

function commitChanges(message) {
  const status = execSync('git status --porcelain', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();

  if (!status) {
    return false;
  }

  run('git add -A');
  run(`git commit -m "${message}"`);
  return true;
}

function runSanityChecks(policy) {
  const checks = policy.train_pr.sanity_checks || [];
  for (const command of checks) {
    run(command);
  }
}

function buildPrBody({ audit, policy, changes, artifactsUrl }) {
  const timestamp = new Date().toISOString();
  const changeLines = changes.length
    ? changes
        .map((change) => {
          const files = change.files.length
            ? change.files.map((file) => `    - ${file}`).join('\n')
            : '    - No file changes detected';
          return `- **${change.id}**: ${change.description}\n${files}`;
        })
        .join('\n')
    : '- No automated change sets produced updates.';

  const auditSummary = audit.safe ? '✅ SAFE' : '❌ NOT SAFE';
  const reasons = audit.reasons.length
    ? audit.reasons.map((reason) => `- ${reason}`).join('\n')
    : '- None';

  return `## Release Train Update\n\n**Audit Status:** ${auditSummary}\n**Generated:** ${timestamp}\n\n### Decision Reasons\n${reasons}\n\n### Included Changes\n${changeLines}\n\n### Audit Artifacts\n- ${artifactsUrl}\n\n---\n\n*Summit Readiness Assertion: docs/SUMMIT_READINESS_ASSERTION.md*\n*Policy source: ${policy.train_pr.required_check_policy}*\n`;
}

async function createOrUpdatePr({
  token,
  owner,
  name,
  branch,
  policy,
  audit,
  changes,
  allowCreate = true,
}) {
  const pullsUrl = `https://api.github.com/repos/${owner}/${name}/pulls?state=open&per_page=100`;
  const pullsResponse = await fetchJson(pullsUrl, token);

  if (!pullsResponse.ok) {
    throw new Error(`Unable to list pull requests: ${pullsResponse.status}`);
  }

  const label = policy.labels?.[0] || 'release-train';
  const selection = selectTrainPullRequest(pullsResponse.data, label);

  if (selection.status === 'multiple') {
    throw new Error('Multiple release-train PRs detected.');
  }

  const artifactsUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const body = buildPrBody({ audit, policy, changes, artifactsUrl });

  if (selection.status === 'found') {
    const updateUrl = `https://api.github.com/repos/${owner}/${name}/pulls/${selection.pull.number}`;
    const updateResponse = await fetchJson(updateUrl, token, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    });

    if (!updateResponse.ok) {
      throw new Error(`Unable to update PR: ${updateResponse.status}`);
    }

    return { action: 'updated', number: selection.pull.number };
  }

  if (!allowCreate) {
    return { action: 'skipped', number: null };
  }

  const createUrl = `https://api.github.com/repos/${owner}/${name}/pulls`;
  const createResponse = await fetchJson(createUrl, token, {
    method: 'POST',
    body: JSON.stringify({
      title: policy.train_pr.title,
      head: branch,
      base: 'main',
      body,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Unable to create PR: ${createResponse.status}`);
  }

  const prNumber = createResponse.data.number;
  const labelsUrl = `https://api.github.com/repos/${owner}/${name}/issues/${prNumber}/labels`;
  await fetchJson(labelsUrl, token, {
    method: 'POST',
    body: JSON.stringify({ labels: policy.labels || [] }),
  });

  if (policy.assignees?.length) {
    const assigneeUrl = `https://api.github.com/repos/${owner}/${name}/issues/${prNumber}/assignees`;
    await fetchJson(assigneeUrl, token, {
      method: 'POST',
      body: JSON.stringify({ assignees: policy.assignees }),
    });
  }

  return { action: 'created', number: prNumber };
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
  const windowCheck = withinAllowedWindow(policy);

  if (!windowCheck.allowed) {
    console.log(`Release train skipped: ${windowCheck.reason}`);
    return;
  }

  if (!audit.safe) {
    throw new Error('Train audit is not safe; refusing to open PR.');
  }

  const token = process.env.GITHUB_TOKEN || '';
  const { owner, name } = parseRepo();

  if (!token || !owner || !name) {
    throw new Error('Missing GitHub token or repository context.');
  }

  configureGitIdentity();
  const branch = policy.train_pr.branch;
  ensureBranch(branch);

  const changes = applyChangeSets(policy);
  const diffFiles = listDiffFiles();

  if (diffFiles.length === 0) {
    const result = await createOrUpdatePr({
      token,
      owner,
      name,
      branch,
      policy,
      audit,
      changes,
      allowCreate: false,
    });

    console.log('No changes detected. Skipping PR creation.');
    console.log(`Release train PR ${result.action}: #${result.number ?? 'n/a'}`);
    return;
  }

  run('node scripts/release/train_diff_policy.mjs --base origin/main');
  runSanityChecks(policy);

  const committed = commitChanges('chore(release): release train update');

  if (!committed) {
    console.log('No changes detected after sanity checks.');
    return;
  }

  run(`git push origin ${branch}`);

  const result = await createOrUpdatePr({
    token,
    owner,
    name,
    branch,
    policy,
    audit,
    changes,
  });

  console.log(`Release train PR ${result.action}: #${result.number}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
