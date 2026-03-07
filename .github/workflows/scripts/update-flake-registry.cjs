const fs = require('fs');
const path = require('path');
const https = require('https');

async function fetchJson(url, token) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Flake-Registry-Updater',
        'Accept': 'application/vnd.github.v3+json',
        ...(token ? { 'Authorization': `token ${token}` } : {})
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`HTTP error ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'acme-corp/intelgraph-platform';

  const registryPath = path.join(process.cwd(), '.github', 'flake-registry.json');
  let registry = { flakes: {}, processed_runs: [] };
  if (fs.existsSync(registryPath)) {
    try {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    } catch (e) {
      console.warn("Failed to parse existing flake registry, starting fresh.");
    }
  }

  if (!registry.flakes) registry.flakes = {};
  if (!registry.processed_runs) registry.processed_runs = [];

  // Keep only the last 100 processed runs to avoid infinite growth
  if (registry.processed_runs.length > 100) {
      registry.processed_runs = registry.processed_runs.slice(-100);
  }

  if (!GITHUB_TOKEN) {
    console.warn("No GITHUB_TOKEN set. Skipping real API fetch.");
  } else {
      console.log(`Fetching recent runs for ${GITHUB_REPOSITORY}...`);
      try {
          // Fetch recent completed runs (both success and failure)
          const runsUrl = `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runs?status=completed&per_page=30`;
          const runsData = await fetchJson(runsUrl, GITHUB_TOKEN);

          for (const run of runsData.workflow_runs || []) {
              if (registry.processed_runs.includes(run.id)) {
                  continue; // Skip already processed runs
              }

              if (run.run_attempt > 1) {
                  // If a run took multiple attempts, check if previous attempts failed
                  for (let attempt = 1; attempt < run.run_attempt; attempt++) {
                      const attemptUrl = `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runs/${run.id}/attempts/${attempt}`;
                      try {
                          const attemptData = await fetchJson(attemptUrl, GITHUB_TOKEN);
                          if (attemptData.conclusion === 'failure') {
                              // It failed previously, but might have succeeded on retry. This is a flake at the workflow level.
                              // For finer granularity, we fetch jobs.
                              const jobsUrl = `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runs/${run.id}/attempts/${attempt}/jobs`;
                              const jobsData = await fetchJson(jobsUrl, GITHUB_TOKEN);

                              for (const job of jobsData.jobs || []) {
                                  if (job.conclusion === 'failure') {
                                      const key = `${run.name}::${job.name}`;

                                      if (!registry.flakes[key]) {
                                          registry.flakes[key] = {
                                              frequency: 0,
                                              suspects: [job.name],
                                              lastSeen: null,
                                              urls: []
                                          };
                                      }

                                      registry.flakes[key].frequency += 1;
                                      registry.flakes[key].lastSeen = run.updated_at;

                                      if (!registry.flakes[key].urls.includes(run.html_url)) {
                                          registry.flakes[key].urls.push(run.html_url);
                                          if (registry.flakes[key].urls.length > 5) {
                                              registry.flakes[key].urls.shift();
                                          }
                                      }
                                  }
                              }
                          }
                      } catch (e) {
                         console.warn(`Could not fetch attempt ${attempt} for run ${run.id}`);
                      }
                  }
              }
              // Mark this run as processed so we don't count its flakes again
              registry.processed_runs.push(run.id);
          }
      } catch (err) {
          console.error("Failed to fetch data from GitHub API:", err.message);
      }
  }

  registry.updatedAt = new Date().toISOString();
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log("Updated flake registry at", registryPath);

  // Generate Flake Attack Plan
  generateFlakeAttackPlan(registry);
}

function generateFlakeAttackPlan(registry) {
    const sortedFlakes = Object.entries(registry.flakes || {}).sort((a, b) => b[1].frequency - a[1].frequency);

    let planContent = `# Flake Attack Plan

## Objective
Identify and eliminate flaky tests and steps across CI workflows to maintain a reliable and determinist CI pipeline.

## SLO Targets
- **P95 CI Duration**: < 15 minutes
- **Flake Rate**: < 1% across all core workflows
- **Mean Time to Triage Flakes**: < 1 hour
- **Resolution Time for High-Frequency Flakes**: < 48 hours

## Flake Registry Analysis
Updated on: ${new Date().toISOString()}

### Prioritized Suspects
`;

    if (sortedFlakes.length === 0) {
        planContent += `\n*No flaky workflows detected in recent history! Keep up the good work.*\n`;
    } else {
        planContent += `| Workflow :: Job | Frequency | Last Seen | Sample URL |\n`;
        planContent += `| --- | --- | --- | --- |\n`;
        for (const [key, data] of sortedFlakes.slice(0, 10)) { // Top 10
            const sampleUrl = data.urls.length > 0 ? data.urls[data.urls.length - 1] : 'N/A';
            planContent += `| ${key} | ${data.frequency} | ${data.lastSeen} | ${sampleUrl} |\n`;
        }
    }

    planContent += `
## Recommended Fixes & Actions

### 1. Auto-Retry Safe Steps (Implemented)
Safe setup steps like \`pnpm install --frozen-lockfile\` and network downloads have been wrapped using \`nick-fields/retry@v3\` with 3 maximum attempts to mitigate transient network or registry errors.

### 2. Isolate and Quarantine
For the top suspects listed above:
- **Playwright/E2E Tests**: Ensure proper \`await expect(...).toBeVisible()\` guards are used instead of hard sleeps.
- **Race Conditions**: Identify shared state mutations in tests. Execute tests with \`--runInBand\` to isolate.
- If a test flakes >3 times in a day, move it to a dedicated quarantine suite so it does not block the golden path.

### 3. CI Determinism Monitoring
The auto-triage workflow automatically labels PRs and Issues with \`p0:ci-determinism\` when keywords like "flaky", "flake", or "nondeterministic" are mentioned.
`;

    const planPath = path.join(process.cwd(), 'docs', 'reports', 'flake_attack_plan.md');
    fs.mkdirSync(path.dirname(planPath), { recursive: true });
    fs.writeFileSync(planPath, planContent);
    console.log(`Generated Flake Attack Plan at ${planPath}`);
}

main().catch(console.error);
