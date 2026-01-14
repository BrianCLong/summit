#!/usr/bin/env node

const DEFAULT_API_BASE = 'https://api.github.com';
const DEFAULT_OUTPUT = 'artifacts/code-scanning-alerts.json';
const DEFAULT_PER_PAGE = 100;

const parseArgs = (argv) => {
  const args = new Map();
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const [key, value] = token.replace(/^--/, '').split('=');
    if (value !== undefined) {
      args.set(key, value);
      continue;
    }
    const nextValue = argv[i + 1];
    if (nextValue && !nextValue.startsWith('--')) {
      args.set(key, nextValue);
      i += 1;
      continue;
    }
    args.set(key, 'true');
  }
  return args;
};

const buildHeaders = (token) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'User-Agent': 'summit-code-scanning-exporter',
  'X-GitHub-Api-Version': '2022-11-28',
});

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const ensureToken = (token) => {
  if (!token) {
    throw new Error(
      'Missing GitHub token. Set GITHUB_TOKEN or pass --token. Requires security_events:read scope.',
    );
  }
};

const fetchAlertsPage = async ({
  apiBase,
  owner,
  repo,
  token,
  page,
  perPage,
  state,
  severity,
  tool,
  branch,
}) => {
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
  });
  if (state) {
    params.set('state', state);
  }
  if (severity) {
    params.set('severity', severity);
  }
  if (tool) {
    params.set('tool_name', tool);
  }
  if (branch) {
    params.set('ref', branch);
  }

  const url = `${apiBase}/repos/${owner}/${repo}/code-scanning/alerts?${params.toString()}`;
  const response = await fetch(url, {
    headers: buildHeaders(token),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${detail}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response payload from GitHub API.');
  }
  return data;
};

const writeOutput = async (payload, outputPath) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
};

const exportAlerts = async () => {
  const args = parseArgs(process.argv);
  const token = args.get('token') || process.env.GITHUB_TOKEN;
  ensureToken(token);

  const owner = args.get('owner') || process.env.GITHUB_OWNER || 'BrianCLong';
  const repo = args.get('repo') || process.env.GITHUB_REPO || 'summit';
  const apiBase = args.get('api-base') || DEFAULT_API_BASE;
  const output = args.get('output') || DEFAULT_OUTPUT;
  const state = args.get('state') || 'open';
  const severity = args.get('severity');
  const tool = args.get('tool');
  const branch = args.get('branch');
  const perPage = toInt(args.get('per-page'), DEFAULT_PER_PAGE);

  let page = 1;
  const alerts = [];

  for (;;) {
    const pageAlerts = await fetchAlertsPage({
      apiBase,
      owner,
      repo,
      token,
      page,
      perPage,
      state,
      severity,
      tool,
      branch,
    });
    alerts.push(...pageAlerts);
    if (pageAlerts.length < perPage) {
      break;
    }
    page += 1;
  }

  const payload = {
    owner,
    repo,
    state,
    severity: severity || null,
    tool: tool || null,
    branch: branch || null,
    total: alerts.length,
    exported_at: new Date().toISOString(),
    alerts,
  };

  await writeOutput(payload, output);
  return payload;
};

const main = async () => {
  try {
    const payload = await exportAlerts();
    process.stdout.write(
      `Exported ${payload.total} Code Scanning alerts to ${payload.owner}/${payload.repo}.\n`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
};

await main();
