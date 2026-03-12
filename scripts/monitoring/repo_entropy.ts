import * as fs from 'fs';
import * as path from 'path';

async function fetchGitHubData(endpoint: string, token?: string) {
  if (!token) return null;
  const res = await fetch(`https://api.github.com/repos/BrianCLong/summit/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'summit-monitoring'
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}: ${res.statusText}`);
  return res.json();
}

async function fetchWorkflowRuns(token?: string) {
  if (!token) {
    return [
      { run_started_at: '2026-03-12T08:00:00Z', updated_at: '2026-03-12T08:15:00Z', status: 'completed' },
      { run_started_at: '2026-03-12T07:00:00Z', updated_at: '2026-03-12T07:10:00Z', status: 'completed' },
    ];
  }
  const data = await fetchGitHubData('actions/runs?per_page=100', token);
  return data?.workflow_runs || [];
}

async function computeRepoEntropy() {
  const token = process.env.GITHUB_TOKEN;
  let open_prs = 0;
  let open_issues = 0;

  if (token) {
    const prs = await fetchGitHubData('pulls?state=open&per_page=100', token);
    const issues = await fetchGitHubData('issues?state=open&per_page=100', token);
    open_prs = prs?.length || 0;
    // GitHub issues API includes PRs, so filter them out
    open_issues = (issues?.filter((i: any) => !i.pull_request) || []).length;
  } else {
    console.warn('No GITHUB_TOKEN, using mock PR/Issue counts.');
    open_prs = 10;
    open_issues = 5;
  }

  const runs = await fetchWorkflowRuns(token);
  let totalRuntime = 0;
  let completedRuns = 0;

  for (const run of runs) {
    if (run.status === 'completed' && run.run_started_at && run.updated_at) {
      const start = new Date(run.run_started_at).getTime();
      const end = new Date(run.updated_at).getTime();
      totalRuntime += (end - start);
      completedRuns++;
    }
  }

  const avgRuntimeMs = completedRuns > 0 ? totalRuntime / completedRuns : 0;

  const output = {
    timestamp: new Date().toISOString(),
    metrics: {
      open_prs,
      open_issues,
      avg_ci_runtime_seconds: Number((avgRuntimeMs / 1000).toFixed(2)),
    }
  };

  const outputDir = path.join(process.cwd(), 'artifacts', 'monitoring');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outPath = path.join(outputDir, 'repo-health.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote repo entropy report to ${outPath}`);

  // Raise issue threshold breached if PRs > 50 or issues > 100 or runtime > 1800s (30m)
  if (open_prs > 50 || open_issues > 100 || (avgRuntimeMs / 1000) > 1800) {
    console.error(`Repo entropy threshold breached! PRs: ${open_prs}, Issues: ${open_issues}, CI Runtime: ${avgRuntimeMs / 1000}s`);
    process.exit(1);
  }
}

computeRepoEntropy().catch(err => {
  console.error('Error computing repo entropy:', err);
  process.exit(1);
});
