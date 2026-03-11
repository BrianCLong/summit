import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const ARTIFACT_DIR = path.resolve('artifacts/monitoring');
const OUTPUT_FILE = path.join(ARTIFACT_DIR, 'repo-health.json');
const PR_THRESHOLD = 50;

function sortObjectKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted: any = {};
  Object.keys(obj).sort().forEach(k => {
    sorted[k] = sortObjectKeys(obj[k]);
  });
  return sorted;
}

async function run() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  console.log('Fetching open PRs...');
  let prCount = 0;
  try {
    const prsJson = execSync('gh pr list --state open --limit 1000 --json number', { encoding: 'utf-8' });
    prCount = JSON.parse(prsJson).length;
  } catch (error) {
    console.warn('Failed to fetch open PRs. Defaulting to 0.');
  }

  console.log('Fetching open issues...');
  let issueCount = 0;
  try {
    const issuesJson = execSync('gh issue list --state open --limit 1000 --json number', { encoding: 'utf-8' });
    issueCount = JSON.parse(issuesJson).length;
  } catch (error) {
    console.warn('Failed to fetch open issues. Defaulting to 0.');
  }

  console.log('Fetching avg CI runtime...');
  let avgRunTime = 0;
  try {
    const runsJson = execSync('gh run list --limit 100 --json status,createdAt,updatedAt', { encoding: 'utf-8' });
    const runs = JSON.parse(runsJson);
    let totalSeconds = 0;
    let completedRuns = 0;

    for (const run of runs) {
      if (run.status === 'completed' && run.createdAt && run.updatedAt) {
        const start = new Date(run.createdAt).getTime();
        const end = new Date(run.updatedAt).getTime();
        totalSeconds += (end - start) / 1000;
        completedRuns++;
      }
    }

    if (completedRuns > 0) {
      avgRunTime = Number((totalSeconds / completedRuns).toFixed(2));
    }
  } catch (error) {
    console.warn('Failed to fetch runs for runtime calculation. Defaulting to 0.');
  }

  const outputData = sortObjectKeys({
    avg_ci_runtime_seconds: avgRunTime,
    open_issues_count: issueCount,
    open_prs_count: prCount
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2) + '\n');
  console.log(`Saved repo health data to ${OUTPUT_FILE}`);

  if (prCount > PR_THRESHOLD && process.env.GITHUB_TOKEN) {
    console.log('PR threshold breached. Checking if issue needs to be created...');
    try {
      const title = 'High Repository Entropy: Open PRs Limit Reached';
      const checkIssue = execSync(`gh issue list --search "in:title \\"${title}\\\" is:open" --json number`, { encoding: 'utf-8' });
      const existingIssues = JSON.parse(checkIssue);

      if (existingIssues.length === 0) {
        console.log('Creating issue...');
        const fullBody = `The repository has reached ${prCount} open PRs, exceeding the soft limit of ${PR_THRESHOLD}. Please review and merge stale PRs.`;
        fs.writeFileSync('/tmp/entropy_issue.md', fullBody);
        execSync(`gh issue create --title "${title}" --body-file /tmp/entropy_issue.md`);
      } else {
        console.log('Issue already exists, skipping creation.');
      }
    } catch (error) {
      console.error('Failed to create or check issue:', error);
    }
  }
}

run().catch(console.error);
