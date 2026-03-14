import * as fs from 'fs';
import * as path from 'path';

async function fetchGitHubAPI(endpoint: string) {
  const url = `https://api.github.com/repos/BrianCLong/summit/${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      ...(process.env.GITHUB_TOKEN ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` } : {})
    }
  });

  if (!response.ok) {
    if (response.status === 403) {
      console.warn(`Rate limit or forbidden on ${endpoint}. Returning empty data to gracefully continue.`);
      return []; // Mock for tests/unauthenticated
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText} on ${endpoint}`);
  }
  return response.json();
}

function stableStringify(obj: any): string {
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  } else if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj).sort();
    let str = '{';
    for (let i = 0; i < keys.length; i++) {
      if (i > 0) str += ',';
      str += `"${keys[i]}":${stableStringify(obj[keys[i]])}`;
    }
    str += '}';
    return str;
  }
  return JSON.stringify(obj);
}

async function checkRepoEntropy() {
  const pullsData = await fetchGitHubAPI('pulls?state=open&per_page=100');
  const issuesData = await fetchGitHubAPI('issues?state=open&per_page=100');

  // Exclude PRs from issues (GitHub API returns PRs as issues too)
  const openIssues = (Array.isArray(issuesData) ? issuesData : []).filter((issue: any) => !issue.pull_request).length;
  const openPRs = Array.isArray(pullsData) ? pullsData.length : 0;

  const runsData = await fetchGitHubAPI('actions/runs?per_page=100');
  const runs = (runsData as any).workflow_runs || [];

  let totalRuntime = 0;
  let completedRuns = 0;

  for (const run of runs) {
    if (run.status === 'completed' && run.run_started_at && run.updated_at) {
      const start = new Date(run.run_started_at).getTime();
      const end = new Date(run.updated_at).getTime();
      const durationSeconds = (end - start) / 1000;
      if (durationSeconds > 0) {
        totalRuntime += durationSeconds;
        completedRuns++;
      }
    }
  }

  const avgCIRuntimeSeconds = completedRuns > 0 ? Math.round(totalRuntime / completedRuns) : 0;

  const output = {
    avg_ci_runtime_seconds: avgCIRuntimeSeconds,
    open_issues_count: openIssues,
    open_prs_count: openPRs
  };

  const formattedOutput = JSON.stringify(JSON.parse(stableStringify(output)), null, 2);
  const outPath = path.resolve('artifacts/monitoring/repo-health.json');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, formattedOutput + '\n');

  console.log(`Repo entropy report written to ${outPath}`);
}

checkRepoEntropy().catch(console.error);
