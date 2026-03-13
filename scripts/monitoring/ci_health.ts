import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const ARTIFACT_DIR = path.resolve('artifacts/monitoring');
const OUTPUT_FILE = path.join(ARTIFACT_DIR, 'ci-health.json');
const THRESHOLD = 0.2; // 20% failure rate

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

  console.log('Fetching recent workflow runs...');
  let runsJson = '';
  try {
    runsJson = execSync('gh run list --limit 100 --json name,conclusion,status', { encoding: 'utf-8' });
  } catch (error) {
    console.error('Failed to fetch runs. Ensure gh CLI is authenticated and repository is accessible.', error);
    process.exit(1);
  }

  const runs = JSON.parse(runsJson);
  const workflowStats: Record<string, { total: number; failures: number }> = {};

  for (const run of runs) {
    if (run.status !== 'completed') continue;
    if (!workflowStats[run.name]) {
      workflowStats[run.name] = { total: 0, failures: 0 };
    }
    workflowStats[run.name].total++;
    if (run.conclusion === 'failure') {
      workflowStats[run.name].failures++;
    }
  }

  const results: Record<string, { failure_rate: number; total_runs: number }> = {};
  let issueBody = '';

  for (const [name, stats] of Object.entries(workflowStats)) {
    const failureRate = stats.failures / stats.total;
    results[name] = {
      failure_rate: Number(failureRate.toFixed(4)),
      total_runs: stats.total
    };

    if (failureRate > THRESHOLD && stats.total > 1) { // ignore single failure noise
      issueBody += `- **${name}**: ${(failureRate * 100).toFixed(1)}% failure rate (${stats.failures}/${stats.total} runs)\n`;
    }
  }

  const outputData = sortObjectKeys({ workflows: results });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2) + '\n');
  console.log(`Saved CI health data to ${OUTPUT_FILE}`);

  if (issueBody && process.env.GITHUB_TOKEN) {
    console.log('Threshold breached. Checking if issue needs to be created...');
    try {
      const title = 'High CI Failure Rate Detected';
      const checkIssue = execSync(`gh issue list --search "in:title \\"${title}\\\" is:open" --json number`, { encoding: 'utf-8' });
      const existingIssues = JSON.parse(checkIssue);

      if (existingIssues.length === 0) {
        console.log('Creating issue...');
        const fullBody = `The following workflows have exceeded the ${THRESHOLD * 100}% failure rate threshold in the last 100 runs:\n\n${issueBody}`;
        fs.writeFileSync('/tmp/ci_issue.md', fullBody);
        execSync(`gh issue create --title "${title}" --body-file /tmp/ci_issue.md`);
      } else {
        console.log('Issue already exists, skipping creation.');
      }
    } catch (error) {
      console.error('Failed to create or check issue:', error);
    }
  }
}

run().catch(console.error);
