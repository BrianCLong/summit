import * as fs from 'fs';
import * as path from 'path';

// Mock GitHub API call or real if token available
async function fetchWorkflowRuns() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('No GITHUB_TOKEN found, using mock workflow runs for testing.');
    return [
      { name: 'CI Core Gate ✅', conclusion: 'success' },
      { name: 'CI Core Gate ✅', conclusion: 'success' },
      { name: 'CI Core Gate ✅', conclusion: 'failure' },
      { name: 'Unit Tests', conclusion: 'success' },
      { name: 'Unit Tests', conclusion: 'failure' },
      { name: 'Release Readiness Gate', conclusion: 'success' },
    ];
  }

  const response = await fetch('https://api.github.com/repos/BrianCLong/summit/actions/runs?per_page=100', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'summit-monitoring'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workflow runs: ${response.statusText}`);
  }

  const data = await response.json();
  return data.workflow_runs.map((r: any) => ({
    name: r.name,
    conclusion: r.conclusion,
  }));
}

async function computeCIHealth() {
  const runs = await fetchWorkflowRuns();
  const stats: Record<string, { total: number; failed: number }> = {};

  for (const run of runs) {
    if (!run.conclusion || run.conclusion === 'skipped' || run.conclusion === 'cancelled') {
      continue;
    }

    if (!stats[run.name]) {
      stats[run.name] = { total: 0, failed: 0 };
    }

    stats[run.name].total++;
    if (run.conclusion === 'failure') {
      stats[run.name].failed++;
    }
  }

  const metrics: Record<string, any> = {};
  for (const [name, data] of Object.entries(stats)) {
    metrics[name] = {
      failure_rate: data.total > 0 ? Number((data.failed / data.total).toFixed(4)) : 0,
      total_runs: data.total,
      failed_runs: data.failed,
    };
  }

  // Sort keys for determinism
  const sortedMetrics: Record<string, any> = {};
  for (const key of Object.keys(metrics).sort()) {
    sortedMetrics[key] = metrics[key];
  }

  const output = {
    timestamp: new Date().toISOString(),
    workflows: sortedMetrics
  };

  const outputDir = path.join(process.cwd(), 'artifacts', 'monitoring');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outPath = path.join(outputDir, 'ci-health.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote CI health metrics to ${outPath}`);

  // Optional threshold check (e.g. exit 1 if any workflow > 50% failure rate)
  let breached = false;
  for (const [name, data] of Object.entries(sortedMetrics)) {
    if (data.failure_rate > 0.5 && data.total_runs >= 3) {
      console.error(`Threshold breached: Workflow '${name}' has a failure rate of ${data.failure_rate} (> 50%)`);
      breached = true;
    }
  }

  if (breached) {
    console.error('One or more CI health thresholds breached.');
    // Keep it non-fatal for script execution, rely on GitHub Actions steps to handle or we exit 1
    // Let's just exit 0 to ensure the JSON is written, we can have a separate job step check thresholds.
    // Wait, the prompt says "Raise issues only on threshold breach". The workflow will likely grep or parse the json.
    // Exiting 1 here means the step fails, which might stop the workflow or cause an issue to be created if handled.
    // Let's exit 1 if breached.
    process.exit(1);
  }
}

computeCIHealth().catch(err => {
  console.error('Error computing CI health:', err);
  process.exit(1);
});
