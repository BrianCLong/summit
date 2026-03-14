import * as fs from 'fs';
import * as path from 'path';

interface WorkflowRun {
  name: string;
  conclusion: string;
}

interface GitHubRunsResponse {
  workflow_runs: WorkflowRun[];
}

async function checkCIHealth() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!token || !repo) {
    console.warn('GITHUB_TOKEN or GITHUB_REPOSITORY not set. Using mock data for CI health.');
    return generateMockData();
  }

  try {
    const url = `https://api.github.com/repos/${repo}/actions/runs?per_page=100`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as GitHubRunsResponse;
    const workflowStats: Record<string, { total: number; failed: number }> = {};

    for (const run of data.workflow_runs) {
      if (!run.conclusion) continue;

      if (!workflowStats[run.name]) {
        workflowStats[run.name] = { total: 0, failed: 0 };
      }

      workflowStats[run.name].total++;
      if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
        workflowStats[run.name].failed++;
      }
    }

    const result: Record<string, any> = {};
    for (const [name, stats] of Object.entries(workflowStats)) {
      result[name] = {
        total_runs: stats.total,
        failed_runs: stats.failed,
        failure_rate: stats.total > 0 ? Number((stats.failed / stats.total).toFixed(4)) : 0,
      };
    }

    // Sort deterministically
    const sortedResult = Object.keys(result)
      .sort()
      .reduce((acc: Record<string, any>, key: string) => {
        acc[key] = result[key];
        return acc;
      }, {});

    writeOutput(sortedResult);

    // Alert if failure rate > 20%
    const failingWorkflows = Object.entries(sortedResult)
      .filter(([_, stats]: [string, any]) => stats.failure_rate > 0.2)
      .map(([name, stats]: [string, any]) => `${name} (Rate: ${(stats.failure_rate * 100).toFixed(1)}%)`);

    if (failingWorkflows.length > 0) {
      await createIssue('🚨 High CI Failure Rate Detected', `The following workflows have a failure rate above 20%:\n\n- ${failingWorkflows.join('\n- ')}\n\nPlease investigate the root causes.`);
    }
  } catch (error) {
    console.error('Error fetching CI health:', error);
    process.exit(1);
  }
}

async function createIssue(title: string, body: string) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    console.log(`[Dry Run Issue] ${title}\n${body}`);
    return;
  }

  try {
    const url = `https://api.github.com/repos/${repo}/issues`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body, labels: ['monitoring', 'ci-health'] })
    });

    if (!res.ok) {
       console.error(`Failed to create issue: ${res.status} ${res.statusText}`);
    } else {
       console.log(`Successfully created issue: ${title}`);
    }
  } catch (e) {
    console.error('Error creating issue:', e);
  }
}

function generateMockData() {
  const result = {
    'Daily GraphRAG Benchmarks': {
      total_runs: 10,
      failed_runs: 0,
      failure_rate: 0
    },
    'Repository Health Monitoring': {
      total_runs: 24,
      failed_runs: 1,
      failure_rate: 0.0417
    }
  };

  const sortedResult = Object.keys(result)
    .sort()
    .reduce((acc: Record<string, any>, key: string) => {
      acc[key] = (result as any)[key];
      return acc;
    }, {});

  writeOutput(sortedResult);
}

function writeOutput(data: any) {
  const outPath = path.resolve('artifacts/monitoring/ci-health.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Wrote CI health data to ${outPath}`);
}

checkCIHealth().catch(console.error);
