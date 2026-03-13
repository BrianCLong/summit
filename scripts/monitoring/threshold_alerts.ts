import * as fs from 'fs';
import * as path from 'path';

async function createGitHubIssue(title: string, body: string) {
  if (!process.env.GITHUB_TOKEN) {
    console.warn(`[WARN] No GITHUB_TOKEN set. Skipping issue creation: "${title}"`);
    return;
  }

  const url = `https://api.github.com/repos/BrianCLong/summit/issues`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      body,
      labels: ['automated-monitoring', 'health-drift']
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to create issue: ${response.status} ${response.statusText} - ${errorText}`);
  } else {
    const data = await response.json();
    console.log(`Created issue #${data.number}: ${title}`);
  }
}

async function checkThresholds() {
  console.log('Checking health thresholds...');
  let issuesToCreate = [];

  // 1. CI Health Thresholds
  const ciHealthPath = path.resolve('artifacts/monitoring/ci-health.json');
  if (fs.existsSync(ciHealthPath)) {
    const ciHealth = JSON.parse(fs.readFileSync(ciHealthPath, 'utf8'));
    const workflows = ciHealth.workflows || {};
    for (const [name, stats] of Object.entries(workflows) as [string, any][]) {
      // Threshold: >50% failure rate over at least 5 runs
      if (stats.failureRate > 0.5 && stats.totalRuns >= 5) {
        issuesToCreate.push({
          title: `[Monitoring] High Failure Rate in ${name}`,
          body: `Workflow \`${name}\` has a failure rate of ${(stats.failureRate * 100).toFixed(1)}% over ${stats.totalRuns} recent runs.\nPlease investigate the root cause.`
        });
      }
    }
  }

  // 2. Determinism Drift Thresholds
  const determinismPath = path.resolve('artifacts/monitoring/determinism-drift.json');
  if (fs.existsSync(determinismPath)) {
    const determinism = JSON.parse(fs.readFileSync(determinismPath, 'utf8'));
    if (determinism.has_drift) {
      issuesToCreate.push({
        title: `[Monitoring] Determinism Drift Detected`,
        body: `Non-deterministic fields found in evaluation artifacts. This breaks reproducibility.\n\nSuspicious fields:\n\`\`\`json\n${JSON.stringify(determinism.suspicious_fields, null, 2)}\n\`\`\``
      });
    }
  }

  // 3. Repo Entropy Thresholds
  const repoEntropyPath = path.resolve('artifacts/monitoring/repo-health.json');
  if (fs.existsSync(repoEntropyPath)) {
    const entropy = JSON.parse(fs.readFileSync(repoEntropyPath, 'utf8'));
    if (entropy.open_prs_count > 50) {
      issuesToCreate.push({
        title: `[Monitoring] High Repository Entropy: Open PRs`,
        body: `There are currently ${entropy.open_prs_count} open pull requests. This exceeds the threshold of 50.\nPlease prioritize code review and merging to reduce entropy.`
      });
    }
    if (entropy.avg_ci_runtime_seconds > 3600) { // 1 hour
      issuesToCreate.push({
         title: `[Monitoring] CI Runtime Degradation`,
         body: `Average CI runtime has exceeded 1 hour (${Math.round(entropy.avg_ci_runtime_seconds/60)} minutes).\nPlease optimize CI pipelines.`
      })
    }
  }

  // 4. Security Drift Thresholds
  const securityPath = path.resolve('artifacts/monitoring/security-health.json');
  if (fs.existsSync(securityPath)) {
    const security = JSON.parse(fs.readFileSync(securityPath, 'utf8'));
    if (security.has_drift) {
      issuesToCreate.push({
        title: `[Monitoring] Security Drift / Vulnerabilities Detected`,
        body: `Security checks indicate drift or new vulnerabilities in dependencies.\n\nLogs:\n\`\`\`\n${security.logs.join('\n')}\n\`\`\``
      });
    }
  }

  // Deduplicate/Throttle - In a real scenario we'd query existing open issues to avoid spamming
  // For this basic implementation we will just fire them if conditions are met.

  for (const issue of issuesToCreate) {
     await createGitHubIssue(issue.title, issue.body);
  }

  if (issuesToCreate.length === 0) {
      console.log('All health thresholds within normal parameters.');
  }
}

checkThresholds().catch(console.error);
