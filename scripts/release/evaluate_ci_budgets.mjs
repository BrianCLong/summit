#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import {
  buildUnitId,
  computeOveragePercent,
  ensureDirectory,
  durationSeconds,
  formatIso,
  loadBudgetConfig,
  loadOverrides,
  matchOverride,
  percentile,
  regressionTriggered,
  validateOverrides,
} from './lib/ci-perf.mjs';

const program = new Command();

program
  .option('--budget-file <path>', 'Budget file path', 'release/CI_PERF_BUDGET.yml')
  .option('--overrides-file <path>', 'Overrides file path', '.github/ci-budget-overrides.yml')
  .option('--repo <repo>', 'GitHub repo (owner/name)', process.env.GITHUB_REPOSITORY)
  .option('--token <token>', 'GitHub token', process.env.GITHUB_TOKEN)
  .option('--current-sha <sha>', 'Current SHA', process.env.GITHUB_SHA)
  .option('--current-branch <branch>', 'Current branch', process.env.GITHUB_REF_NAME)
  .option('--event-name <event>', 'GitHub event name', process.env.GITHUB_EVENT_NAME)
  .option('--baseline-branch <branch>', 'Baseline branch', 'main')
  .option('--history-days <days>', 'History window days', '30')
  .option('--out-dir <path>', 'Output directory', 'dist/ci-perf')
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

const historyDays = Number(options.historyDays);

const budgetConfig = loadBudgetConfig(options.budgetFile);
const overridesConfig = loadOverrides(options.overridesFile);

const overrideFailures = validateOverrides(overridesConfig);
if (overrideFailures.length) {
  console.error('Governed Exceptions registry violations detected:');
  for (const failure of overrideFailures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

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

async function listWorkflowRuns(workflowFile, params = {}) {
  const runs = [];
  let page = 1;
  const cutoff = Date.now() - historyDays * 24 * 60 * 60 * 1000;

  while (true) {
    const search = new URLSearchParams({
      per_page: '100',
      page: String(page),
      status: 'completed',
      ...params,
    });
    const url = `${baseUrl}/actions/workflows/${workflowFile}/runs?${search.toString()}`;
    const payload = await githubRequest(url);
    const fetched = payload.workflow_runs ?? [];
    if (!fetched.length) {
      break;
    }
    for (const run of fetched) {
      const createdAt = Date.parse(run.created_at ?? run.run_started_at ?? run.updated_at);
      if (!Number.isNaN(createdAt) && createdAt < cutoff && !params.head_sha) {
        return runs;
      }
      runs.push(run);
    }
    page += 1;
    if (runs.length >= 200 || fetched.length < 100) {
      break;
    }
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

async function findCurrentRun(workflowFile, sha) {
  if (!sha) {
    return null;
  }
  const runs = await listWorkflowRuns(workflowFile, { head_sha: sha });
  return runs[0] ?? null;
}

async function baselineDurations(workflowFile, jobName, stepGroup) {
  const runs = await listWorkflowRuns(workflowFile, { branch: options.baselineBranch });
  const durations = [];
  for (const run of runs) {
    if (jobName === '__gate__') {
      const runDuration = durationSeconds(run.run_started_at ?? run.created_at, run.updated_at);
      if (runDuration !== null) {
        durations.push(runDuration);
      }
      continue;
    }
    const jobs = await listJobs(run.id);
    const match = jobs.find((job) => job.name === jobName);
    if (!match) {
      continue;
    }
    const jobDuration = durationSeconds(match.started_at, match.completed_at);
    if (jobDuration !== null) {
      durations.push(jobDuration);
    }
  }
  return durations;
}

function scopeApplies(scope, eventName, branchName) {
  if (scope === 'PR') {
    return eventName?.includes('pull_request');
  }
  if (scope === 'main-only') {
    return eventName === 'push' && branchName === 'main';
  }
  if (scope === 'release-branch-only') {
    return eventName === 'push' && branchName?.startsWith('release/');
  }
  return false;
}

async function evaluate() {
  ensureDirectory(options.outDir);
  const reportPath = path.join(options.outDir, 'budget-eval.json');
  const markdownPath = path.join(options.outDir, 'budget-eval.md');

  const results = [];

  for (const budget of budgetConfig.budgets ?? []) {
    const applies = scopeApplies(budget.scope, options.eventName, options.currentBranch);
    const unitId = buildUnitId(budget);
    if (!applies) {
      results.push({
        unit_id: unitId,
        workflow_file: budget.workflow_file,
        job: budget.job,
        scope: budget.scope,
        status: 'skipped',
        note: 'Intentionally constrained: scope mismatch.',
      });
      continue;
    }

    const currentRun = await findCurrentRun(budget.workflow_file, options.currentSha);
    let currentDuration = null;
    if (currentRun) {
      if (budget.job === '__gate__') {
        currentDuration = durationSeconds(
          currentRun.run_started_at ?? currentRun.created_at,
          currentRun.updated_at,
        );
      } else {
        const jobs = await listJobs(currentRun.id);
        const match = jobs.find((job) => job.name === budget.job);
        if (match) {
          currentDuration = durationSeconds(match.started_at, match.completed_at);
        }
      }
    }

    const baseline = await baselineDurations(
      budget.workflow_file,
      budget.job,
      budget.step_group,
    );
    const p50 = percentile(baseline, 50);
    const p95 = percentile(baseline, 95);

    const violations = [];
    let status = 'pass';
    let note = '';

    if (currentDuration === null) {
      status = 'deferred';
      note = 'Deferred pending current run data.';
    } else if (currentDuration > budget.hard_limit_seconds) {
      status = 'fail';
      violations.push({
        type: 'hard_limit',
        limit_seconds: budget.hard_limit_seconds,
        observed_seconds: currentDuration,
      });
    } else {
      if (currentDuration > budget.budget_seconds_p95) {
        violations.push({
          type: 'budget_p95',
          limit_seconds: budget.budget_seconds_p95,
          observed_seconds: currentDuration,
        });
      }
      if (currentDuration > budget.budget_seconds_p50) {
        violations.push({
          type: 'budget_p50',
          limit_seconds: budget.budget_seconds_p50,
          observed_seconds: currentDuration,
        });
      }
      if (p50 !== null) {
        if (regressionTriggered(currentDuration, p50, budget.regression_threshold_percent)) {
          violations.push({
            type: 'regression_p50',
            baseline_seconds: p50,
            threshold_percent: budget.regression_threshold_percent,
            observed_seconds: currentDuration,
          });
        }
      }
      if (p95 !== null) {
        if (regressionTriggered(currentDuration, p95, budget.regression_threshold_percent)) {
          violations.push({
            type: 'regression_p95',
            baseline_seconds: p95,
            threshold_percent: budget.regression_threshold_percent,
            observed_seconds: currentDuration,
          });
        }
      }

      if (!baseline.length) {
        note = 'Deferred pending baseline history.';
      }

      if (violations.length) {
        status = 'fail';
        const override = matchOverride(overridesConfig, budget);
        if (override) {
          const allowed = override.allowed_overage_percent ?? 0;
          const reference = budget.budget_seconds_p95;
          const overage = computeOveragePercent(currentDuration, reference);
          if (overage !== null && overage <= allowed) {
            status = 'overridden';
            note = `Governed Exception applied (allowed overage ${allowed}%).`;
          }
        }
      }
    }

    results.push({
      unit_id: unitId,
      workflow_file: budget.workflow_file,
      job: budget.job,
      scope: budget.scope,
      current_duration_seconds: currentDuration,
      budgets: {
        p50_seconds: budget.budget_seconds_p50,
        p95_seconds: budget.budget_seconds_p95,
        hard_limit_seconds: budget.hard_limit_seconds,
        regression_threshold_percent: budget.regression_threshold_percent,
      },
      baseline: {
        p50_seconds: p50,
        p95_seconds: p95,
        sample_count: baseline.length,
      },
      status,
      note,
      violations,
    });
  }

  const summary = {
    total: results.length,
    passed: results.filter((result) => result.status === 'pass').length,
    failed: results.filter((result) => result.status === 'fail').length,
    overridden: results.filter((result) => result.status === 'overridden').length,
    deferred: results.filter((result) => result.status === 'deferred').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
  };

  const report = {
    generated_at: formatIso(new Date()),
    scope: {
      event: options.eventName,
      branch: options.currentBranch,
      sha: options.currentSha,
      baseline_branch: options.baselineBranch,
    },
    summary,
    results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const lines = [];
  lines.push('# CI Performance Budget Evaluation');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');
  lines.push('| Unit | Status | Current (s) | p50 Budget | p95 Budget | Hard Limit | Note |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const result of results) {
    const statusLabel = result.status.toUpperCase();
    lines.push(
      `| ${result.unit_id} | ${statusLabel} | ${result.current_duration_seconds ?? '-'} | ${
        result.budgets?.p50_seconds ?? '-'
      } | ${result.budgets?.p95_seconds ?? '-'} | ${
        result.budgets?.hard_limit_seconds ?? '-'
      } | ${result.note ?? ''} |`,
    );
  }

  lines.push('');
  lines.push('## Next Steps');
  lines.push('- Split tests, enable caching, or parallelize long-running jobs.');
  lines.push('- If a short-term exception is required, add a Governed Exception override.');
  lines.push('- Re-baseline once optimizations stabilize.');

  fs.writeFileSync(markdownPath, `${lines.join('\n')}\n`);

  if (summary.failed > 0) {
    console.error('CI performance budgets exceeded without a valid override.');
    process.exit(1);
  }
}

evaluate().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
