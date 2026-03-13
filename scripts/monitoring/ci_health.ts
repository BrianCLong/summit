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
      return { workflow_runs: [] }; // Mock for tests/unauthenticated
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

async function checkCIHealth() {
  const data = await fetchGitHubAPI('actions/runs?per_page=100');
  const runs = data.workflow_runs || [];

  const workflows: Record<string, { total: number; failed: number }> = {};

  for (const run of runs) {
    const name = run.name;
    if (!workflows[name]) {
      workflows[name] = { total: 0, failed: 0 };
    }
    workflows[name].total++;
    if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
      workflows[name].failed++;
    }
  }

  const results: Record<string, { failureRate: number; totalRuns: number }> = {};
  for (const name in workflows) {
    results[name] = {
      failureRate: workflows[name].total > 0 ? workflows[name].failed / workflows[name].total : 0,
      totalRuns: workflows[name].total
    };
  }

  // Create deterministic stable JSON output
  const output = {
    workflows: results
  };

  const formattedOutput = JSON.stringify(JSON.parse(stableStringify(output)), null, 2);

  const outPath = path.resolve('artifacts/monitoring/ci-health.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, formattedOutput + '\n');

  console.log(`CI health report written to ${outPath}`);
}

checkCIHealth().catch(console.error);
