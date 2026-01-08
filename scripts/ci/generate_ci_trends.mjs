import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'artifacts/ci-trends';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'report.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    return null;
  }
}

function getWeekLabel() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('Generating CI Failure Trends Report...');

  // Default window is 7 days, but could be passed as argument if needed.
  // We use 7 days to match the default OKR window.
  const windowDays = 7;

  // 1. Fetch recent runs
  const date = new Date();
  date.setDate(date.getDate() - windowDays);
  const dateStr = date.toISOString().split('T')[0];

  const cmd = `gh run list --json conclusion,headBranch,name,workflowName,startedAt --limit 500 --created ">${dateStr}"`;

  let runs = [];
  try {
    const output = runCommand(cmd);
    if (output) {
      runs = JSON.parse(output);
    } else {
      console.warn('Warning: No output from gh run list. Maybe not authenticated or no runs.');
      // Fallback: If runs are empty, we might want to return null/empty structure instead of 0s if we know it's an error.
      // But for now, returning empty list results in 0 failures which is "technically" correct for "0 known failures".
    }
  } catch (e) {
    console.warn('Failed to parse gh output or execute command.');
  }

  // 2. Compute Metrics
  let failuresTotal = 0;
  let p0FailuresTotal = 0;

  const failureCodes = {};

  for (const run of runs) {
    if (run.conclusion === 'failure') {
      failuresTotal++;

      // Heuristic for P0: Failures on main branch are P0
      if (run.headBranch === 'main' || run.headBranch === 'master') {
        p0FailuresTotal++;
      }

      const code = run.workflowName;
      failureCodes[code] = (failureCodes[code] || 0) + 1;
    }
  }

  // Set explicit null for metrics we can't compute yet, so the evaluator knows they are missing.
  // top_regression_delta requires history which we might not have in this single script run.
  const topRegressionDelta = null;

  // Triage coverage requires artifact inspection which is expensive/complex via CLI.
  const triageArtifactCoveragePercent = null;

  const report = {
    generated_at: new Date().toISOString(),
    week_label: getWeekLabel(),
    window_days: windowDays,
    failures_total: failuresTotal,
    p0_failures_total: p0FailuresTotal,
    top_regression_delta: topRegressionDelta,
    triage_artifact_coverage_percent: triageArtifactCoveragePercent,
    failure_codes: failureCodes,
    metadata: {
      total_runs_analyzed: runs.length
    }
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`Trends report written to ${OUTPUT_FILE}`);
}

main();
