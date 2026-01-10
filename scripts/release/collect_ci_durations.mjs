#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import {
  buildUnitId,
  ensureDirectory,
  formatIso,
  loadBudgetConfig,
  summarizeEntries,
  durationSeconds,
} from './lib/ci-perf.mjs';

const program = new Command();

program
  .option('--budget-file <path>', 'Budget file path', 'release/CI_PERF_BUDGET.yml')
  .option('--repo <repo>', 'GitHub repo (owner/name)', process.env.GITHUB_REPOSITORY)
  .option('--token <token>', 'GitHub token', process.env.GITHUB_TOKEN)
  .option('--branch <branch>', 'Branch filter (optional)')
  .option('--since-days <days>', 'History window days', '30')
  .option('--out-dir <path>', 'Output directory', 'dist/ci-perf')
  .option('--max-runs <count>', 'Max workflow runs per workflow', '200')
  .parse(process.argv);

const options = program.opts();

if (!options.repo) {
  console.error('Missing --repo or GITHUB_REPOSITORY.');
  process.exit(1);
}

if (!options.token) {
  console.error('Missing --token or GITHUB_TOKEN.');
  process.exit(1);
}

const sinceDays = Number(options.sinceDays);
const maxRuns = Number(options.maxRuns);
const outDir = options.outDir;

const budgetConfig = loadBudgetConfig(options.budgetFile);
const workflowFiles = Array.from(
  new Set((budgetConfig.budgets ?? []).map((budget) => budget.workflow_file)),
);

const baseUrl = `https://api.github.com/repos/${options.repo}`;

async function githubRequest(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${options.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API request failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function listWorkflowRuns(workflowFile) {
  const runs = [];
  let page = 1;
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;

  while (runs.length < maxRuns) {
    const params = new URLSearchParams({
      per_page: '100',
      page: String(page),
      status: 'completed',
    });
    if (options.branch) {
      params.set('branch', options.branch);
    }
    const url = `${baseUrl}/actions/workflows/${workflowFile}/runs?${params.toString()}`;
    const payload = await githubRequest(url);
    const fetched = payload.workflow_runs ?? [];
    if (!fetched.length) {
      break;
    }

    for (const run of fetched) {
      const created = Date.parse(run.created_at ?? run.run_started_at ?? run.updated_at);
      if (Number.isNaN(created)) {
        continue;
      }
      if (created < cutoff) {
        return runs;
      }
      runs.push(run);
      if (runs.length >= maxRuns) {
        return runs;
      }
    }
    page += 1;
  }
  return runs;
}

async function listJobs(runId) {
  const jobs = [];
  let page = 1;
  while (true) {
    const url = `${baseUrl}/actions/runs/${runId}/jobs?per_page=100&page=${page}`;
    const payload = await githubRequest(url);
    const fetched = payload.jobs ?? [];
    jobs.push(...fetched);
    if (!payload.total_count || jobs.length >= payload.total_count) {
      break;
    }
    if (!fetched.length) {
      break;
    }
    page += 1;
  }
  return jobs;
}

async function main() {
  ensureDirectory(outDir);
  const jsonlPath = path.join(outDir, 'ci-durations.jsonl');
  const summaryPath = path.join(outDir, 'ci-durations-summary.json');
  const stream = fs.createWriteStream(jsonlPath, { flags: 'w' });
  const entries = [];

  for (const workflowFile of workflowFiles) {
    const runs = await listWorkflowRuns(workflowFile);
    for (const run of runs) {
      const runStarted = run.run_started_at ?? run.created_at;
      const runCompleted = run.updated_at;
      const gateDuration = durationSeconds(runStarted, runCompleted);
      if (gateDuration !== null) {
        const gateEntry = {
          captured_at: formatIso(new Date()),
          unit_type: 'gate',
          unit_id: buildUnitId({ workflow_file: workflowFile, job: '__gate__' }),
          workflow_file: workflowFile,
          workflow_name: run.name,
          job_name: '__gate__',
          run_id: run.id,
          run_attempt: run.run_attempt,
          head_branch: run.head_branch,
          head_sha: run.head_sha,
          event: run.event,
          status: run.status,
          conclusion: run.conclusion,
          started_at: runStarted,
          completed_at: runCompleted,
          duration_seconds: gateDuration,
        };
        entries.push(gateEntry);
        stream.write(`${JSON.stringify(gateEntry)}\n`);
      }

      const jobs = await listJobs(run.id);
      for (const job of jobs) {
        const jobDuration = durationSeconds(job.started_at, job.completed_at);
        if (jobDuration === null) {
          continue;
        }
        const entry = {
          captured_at: formatIso(new Date()),
          unit_type: 'job',
          unit_id: buildUnitId({ workflow_file: workflowFile, job: job.name }),
          workflow_file: workflowFile,
          workflow_name: run.name,
          job_name: job.name,
          run_id: run.id,
          run_attempt: run.run_attempt,
          head_branch: run.head_branch,
          head_sha: run.head_sha,
          event: run.event,
          status: job.status,
          conclusion: job.conclusion,
          started_at: job.started_at,
          completed_at: job.completed_at,
          duration_seconds: jobDuration,
        };
        entries.push(entry);
        stream.write(`${JSON.stringify(entry)}\n`);
      }
    }
  }

  stream.end();

  const summaries = summarizeEntries(entries, [7, 30]);
  const summaryPayload = {
    generated_at: formatIso(new Date()),
    source: 'github-actions',
    windows: [7, 30],
    units: summaries,
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summaryPayload, null, 2));

  console.log(`Wrote ${entries.length} entries to ${jsonlPath}`);
  console.log(`Wrote summary to ${summaryPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
