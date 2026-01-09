import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';
import {
  collectDashboardFiles,
  enforceDenylist,
  redactDashboard,
  readJsonFile,
  sha256File,
  writeJsonFile,
} from './lib/release-metrics.mjs';

const parseArgs = (argv) => {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) {
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args.set(key, true);
    } else {
      args.set(key, value);
      i += 1;
    }
  }
  return args;
};

const toMinutes = (start, end) => {
  if (!start || !end) {
    return null;
  }
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return null;
  }
  return Math.max(0, (endMs - startMs) / 60000);
};

const fetchJson = async (url, token) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

const fetchWorkflowRuns = async (repo, commitSha, token) => {
  const url = `https://api.github.com/repos/${repo}/actions/runs?head_sha=${commitSha}&per_page=100`;
  const data = await fetchJson(url, token);
  return data.workflow_runs || [];
};

const fetchCommitTimestamp = async (repo, commitSha, token) => {
  const url = `https://api.github.com/repos/${repo}/commits/${commitSha}`;
  const data = await fetchJson(url, token);
  return data.commit?.committer?.date || null;
};

const summarizeRuns = (runs) =>
  runs.map((run) => {
    const startedAt = run.run_started_at || run.created_at || null;
    const updatedAt = run.updated_at || null;
    return {
      id: run.id,
      name: run.name,
      run_attempt: run.run_attempt || 1,
      status: run.status,
      conclusion: run.conclusion,
      run_started_at: startedAt,
      updated_at: updatedAt,
      duration_minutes: toMinutes(startedAt, updatedAt),
    };
  });

const computeGateMetrics = (check, runs) => {
  const matching = runs.filter((run) => run.name === check.name);
  const summarized = summarizeRuns(matching);
  const latest = summarized
    .slice()
    .sort((a, b) => Date.parse(b.updated_at || 0) - Date.parse(a.updated_at || 0))[0];
  const runAttempts = summarized.map((run) => run.run_attempt || 1);
  const maxAttempt = runAttempts.length > 0 ? Math.max(...runAttempts) : 1;
  const rerunCount = Math.max(0, matching.length - 1, maxAttempt - 1);
  return {
    name: check.name,
    required: check.required,
    status: check.status,
    conclusion: check.conclusion,
    duration_minutes: latest ? latest.duration_minutes : null,
    rerun_count: rerunCount,
    workflow_run_ids: summarized.map((run) => run.id),
  };
};

const computeTimeToGreen = (checks, runs, commitTimestamp, promotableState) => {
  if (promotableState !== 'success') {
    return null;
  }
  const requiredChecks = checks.filter((check) => check.required !== 'conditional_skipped');
  const relevantRuns = runs.filter((run) =>
    requiredChecks.some((check) => check.name === run.name),
  );
  if (relevantRuns.length === 0) {
    return null;
  }
  const startedTimes = relevantRuns.map((run) => run.run_started_at || run.created_at).filter(Boolean);
  const completedTimes = relevantRuns.map((run) => run.updated_at).filter(Boolean);
  if (startedTimes.length === 0 || completedTimes.length === 0) {
    return null;
  }
  const start = commitTimestamp || startedTimes.sort()[0];
  const end = completedTimes.sort().slice(-1)[0];
  return toMinutes(start, end);
};

const buildSummary = (entries) => {
  const summary = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    totals: {
      entries: entries.length,
      releasable: entries.filter((entry) => entry.releasable).length,
      blocked: entries.filter((entry) => entry.candidate.promotable_state === 'blocked').length,
      pending: entries.filter((entry) => entry.candidate.promotable_state === 'pending').length,
    },
    branches: {},
  };

  for (const entry of entries) {
    const branch = entry.branch;
    if (!summary.branches[branch]) {
      summary.branches[branch] = { entries: 0, releasable: 0 };
    }
    summary.branches[branch].entries += 1;
    if (entry.releasable) {
      summary.branches[branch].releasable += 1;
    }
  }

  return summary;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const dashboardDir = args.get('--dashboard-dir') || 'artifacts/release-train';
  const outputDir = args.get('--output-dir') || 'dist/release-metrics';
  const repository =
    args.get('--repo') || process.env.GITHUB_REPOSITORY || 'unknown/unknown';
  const branch = args.get('--branch') || 'main';
  const skipGithub = args.get('--skip-github') || false;
  const requireSha256 =
    args.get('--require-sha256') || process.env.REQUIRE_DASHBOARD_SHA256 === '1';
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

  const schemaPath = path.resolve('schemas/release-metrics.schema.json');
  const schema = readJsonFile(schemaPath);
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);

  const files = collectDashboardFiles(dashboardDir);
  if (files.length === 0) {
    console.error(`No dashboard.json files found in ${dashboardDir}`);
    process.exit(1);
  }

  const entries = [];

  for (const file of files) {
    const dashboardRaw = readJsonFile(file);
    const dashboard = redactDashboard(dashboardRaw);
    enforceDenylist(dashboard);

    const dashboardSha = sha256File(file);
    const hashPath = `${file}.sha256`;
    if (requireSha256) {
      if (!fs.existsSync(hashPath)) {
        throw new Error(`Missing dashboard hash file: ${hashPath}`);
      }
      const expectedHash = fs.readFileSync(hashPath, 'utf-8').trim().split(' ')[0];
      if (expectedHash !== dashboardSha) {
        throw new Error(`Dashboard hash mismatch for ${file}`);
      }
    }
    const capturedAt = new Date().toISOString();

    for (const candidate of dashboard.candidates || []) {
      const commitSha = candidate.commit_sha;
      const workflowRuns = skipGithub
        ? []
        : await fetchWorkflowRuns(repository, commitSha, token);
      const commitTimestamp = skipGithub
        ? null
        : await fetchCommitTimestamp(repository, commitSha, token);

      const gates = (candidate.checks || []).map((check) =>
        computeGateMetrics(check, workflowRuns),
      );
      const rerunGates = gates.filter((gate) => gate.rerun_count > 0).length;
      const timeToGreen = computeTimeToGreen(
        candidate.checks || [],
        workflowRuns,
        commitTimestamp,
        candidate.promotable_state,
      );

      const entry = {
        version: '1.0.0',
        captured_at: capturedAt,
        repository,
        branch: candidate.candidate_type === 'main' ? branch : 'release-candidate',
        commit_sha: commitSha,
        commit_timestamp: commitTimestamp,
        candidate: {
          type: candidate.candidate_type,
          tag: candidate.tag,
          promotable_state: candidate.promotable_state,
        },
        releasable:
          candidate.candidate_type === 'main' && candidate.promotable_state === 'success',
        time_to_green_minutes: timeToGreen,
        flake_count: rerunGates,
        gates,
        evidence: {
          dashboard_sha256: dashboardSha,
          dashboard_path: path.relative(process.cwd(), file),
          workflow_runs: summarizeRuns(workflowRuns),
        },
        policy_drift: {
          soft_gate_violations: 0,
          branch_protection_mismatches: 0,
          status: 'intentionally_constrained',
        },
      };

      enforceDenylist(entry);

      const valid = validate(entry);
      if (!valid) {
        console.error('Schema validation failed', validate.errors);
        process.exit(1);
      }
      entries.push(entry);
    }
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const jsonlPath = path.join(outputDir, 'release-metrics.jsonl');
  const jsonlContent = entries.map((entry) => JSON.stringify(entry)).join('\n');
  fs.writeFileSync(jsonlPath, `${jsonlContent}\n`);

  const summary = buildSummary(entries);
  writeJsonFile(path.join(outputDir, 'release-metrics-summary.json'), summary);

  console.log(`Wrote ${entries.length} release metric entries to ${jsonlPath}`);
};

await main();
