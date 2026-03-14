import * as fs from 'fs';
import * as path from 'path';

async function checkRepoEntropy() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!token || !repo) {
    console.warn('GITHUB_TOKEN or GITHUB_REPOSITORY not set. Using mock data for repo entropy.');
    return generateMockData();
  }

  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    };

    const pullsUrl = `https://api.github.com/repos/${repo}/pulls?state=open&per_page=1`;
    const pullsResponse = await fetch(pullsUrl, { headers });
    let openPrCount = 0;

    // GitHub API puts total count in link header for pagination
    if (pullsResponse.ok) {
        const linkHeader = pullsResponse.headers.get('link');
        if (linkHeader) {
            const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
            if (match) {
                openPrCount = parseInt(match[1], 10);
            } else {
                const data = await pullsResponse.json();
                openPrCount = data.length;
            }
        } else {
            const data = await pullsResponse.json();
            openPrCount = data.length;
        }
    }

    const issuesUrl = `https://api.github.com/repos/${repo}/issues?state=open&per_page=1`;
    const issuesResponse = await fetch(issuesUrl, { headers });
    let openIssuesCount = 0;
    if (issuesResponse.ok) {
        const linkHeader = issuesResponse.headers.get('link');
        if (linkHeader) {
            const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
            if (match) {
                openIssuesCount = parseInt(match[1], 10);
            } else {
                const data = await issuesResponse.json();
                openIssuesCount = data.length;
            }
        } else {
            const data = await issuesResponse.json();
            openIssuesCount = data.length;
        }
    }

    // Subtract PRs from issues (GitHub API treats PRs as issues)
    openIssuesCount = Math.max(0, openIssuesCount - openPrCount);

    const runsUrl = `https://api.github.com/repos/${repo}/actions/runs?per_page=30&status=completed`;
    const runsResponse = await fetch(runsUrl, { headers });
    let avgCiRuntime = 0;

    if (runsResponse.ok) {
        const runsData = await runsResponse.json();
        let totalTime = 0;
        let validRuns = 0;

        for (const run of runsData.workflow_runs) {
            if (run.run_started_at && run.updated_at) {
                const start = new Date(run.run_started_at).getTime();
                const end = new Date(run.updated_at).getTime();
                if (end > start) {
                    totalTime += (end - start);
                    validRuns++;
                }
            }
        }

        if (validRuns > 0) {
            avgCiRuntime = Math.round(totalTime / validRuns / 1000); // in seconds
        }
    }

    const result = {
        avg_ci_runtime_seconds: avgCiRuntime,
        open_issues_count: openIssuesCount,
        open_pr_count: openPrCount,
        repo: repo
    };

    // Sort deterministically
    const sortedResult = Object.keys(result)
      .sort()
      .reduce((acc: Record<string, any>, key: string) => {
        acc[key] = (result as any)[key];
        return acc;
      }, {});

    writeOutput(sortedResult);

    // Alert if thresholds are breached
    let body = [];
    if (openPrCount > 100) body.push(`- Open PR Count is very high: ${openPrCount} (> 100)`);
    if (openIssuesCount > 500) body.push(`- Open Issue Count is very high: ${openIssuesCount} (> 500)`);
    if (avgCiRuntime > 3600) body.push(`- Average CI Runtime is very high: ${Math.round(avgCiRuntime / 60)} minutes (> 60 minutes)`);

    if (body.length > 0) {
       await createIssue('🚨 Repo Entropy Threshold Breached', `Repository health thresholds have been breached:\n\n${body.join('\n')}\n\nPlease review the queue.`);
    }

  } catch (error) {
    console.error('Error fetching repo entropy:', error);
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
      body: JSON.stringify({ title, body, labels: ['monitoring', 'repo-entropy'] })
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
    avg_ci_runtime_seconds: 450,
    open_issues_count: 12,
    open_pr_count: 5,
    repo: "mock/repo"
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
  const outPath = path.resolve('artifacts/monitoring/repo-health.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Wrote repo entropy data to ${outPath}`);
}

checkRepoEntropy().catch(console.error);
