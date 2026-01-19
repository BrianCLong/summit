import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const METRICS_DIR = path.join(ROOT_DIR, 'artifacts', 'delivery-metrics');
const DOCS_DIR = path.join(ROOT_DIR, 'docs', 'delivery');
const DASHBOARD_FILE = path.join(DOCS_DIR, 'FOUR_KEYS.md');

// Ensure docs directory exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

function getAllEvents() {
  if (!fs.existsSync(METRICS_DIR)) return [];
  const events = [];
  const days = fs.readdirSync(METRICS_DIR).sort();

  for (const day of days) {
    const file = path.join(METRICS_DIR, day, 'events.ndjson');
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      content.split('\n').forEach(line => {
        if (line.trim()) {
          try {
            events.push(JSON.parse(line));
          } catch (e) {
            console.error(`Failed to parse line in ${file}:`, line);
          }
        }
      });
    }
  }
  return events;
}

function median(values) {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  const half = Math.floor(values.length / 2);
  if (values.length % 2) return values[half];
  return (values[half - 1] + values[half]) / 2.0;
}

function computeMetrics(events, windowDays = 7) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const relevantEvents = events.filter(e => new Date(e.ts) >= cutoff);
  const prodDeploys = relevantEvents.filter(e => e.type === 'deploy_succeeded' && e.env === 'prod');
  const failedDeploys = relevantEvents.filter(e => e.type === 'deploy_failed' && e.env === 'prod');
  const incidents = relevantEvents.filter(e => e.type === 'incident_opened');

  // 1. Deployment Frequency
  const daysInWindow = windowDays; // Simplified
  const frequencyPerDay = prodDeploys.length / daysInWindow;

  // 2. Lead Time for Changes
  const leadTimes = [];
  const commits = new Map();
  relevantEvents.filter(e => e.type === 'commit_pushed').forEach(c => commits.set(c.sha, new Date(c.ts)));

  prodDeploys.forEach(d => {
    if (commits.has(d.sha)) {
      const deployTime = new Date(d.ts);
      const commitTime = commits.get(d.sha);
      const diffHours = (deployTime - commitTime) / (1000 * 60 * 60);
      if (diffHours > 0) leadTimes.push(diffHours);
    }
  });
  const leadTimeHours = median(leadTimes);

  // 3. Change Failure Rate
  const totalDeploys = prodDeploys.length + failedDeploys.length;
  // Approximation: count failed deploys + incidents linked to deploys
  // Ideally link incidents to deploys. Here we use raw count.
  const failCount = failedDeploys.length + incidents.length;
  const cfr = totalDeploys > 0 ? (failCount / totalDeploys) : 0;

  // 4. Time to Restore
  const ttrValues = [];
  const openIncidents = new Map();
  relevantEvents.forEach(e => {
    if (e.type === 'incident_opened') {
        // Use a unique ID if available, otherwise just use timestamp or something
        // For now, assume single stream or use linked-deploy-id
        // This is a naive implementation
    }
    if (e.type === 'incident_resolved' && e.opened_at) {
        const opened = new Date(e.opened_at);
        const resolved = new Date(e.resolved_at || e.ts);
        const diffMinutes = (resolved - opened) / (1000 * 60);
        if (diffMinutes > 0) ttrValues.push(diffMinutes);
    }
  });
  // Also scan for resolved events that link to previous open events if implemented
  const ttrMinutes = median(ttrValues);

  return {
    windowDays,
    deployment_frequency_per_day: frequencyPerDay.toFixed(2),
    lead_time_for_changes_hours: leadTimeHours.toFixed(1),
    change_failure_rate: (cfr * 100).toFixed(1) + '%',
    time_to_restore_median_minutes: ttrMinutes.toFixed(0)
  };
}

function generateDashboard(metrics) {
  return `# DORA Metrics (Last ${metrics.windowDays} Days)

Generated at: ${new Date().toISOString()}

| Metric | Value | Description |
| :--- | :--- | :--- |
| **Deployment Frequency** | **${metrics.deployment_frequency_per_day}** / day | How often code is deployed to production. |
| **Lead Time for Changes** | **${metrics.lead_time_for_changes_hours}** hours | Median time from commit to production. |
| **Change Failure Rate** | **${metrics.change_failure_rate}** | Percentage of deployments causing a failure in production. |
| **Time to Restore** | **${metrics.time_to_restore_median_minutes}** min | Median time to resolve incidents. |

## Trends

*To be implemented: Sparklines or historical graph*

## Latest Rollup

\`\`\`json
${JSON.stringify(metrics, null, 2)}
\`\`\`
`;
}

// Main execution
const events = getAllEvents();
const metrics = computeMetrics(events, 7);
const dashboard = generateDashboard(metrics);

console.log('Metrics computed:', metrics);

fs.writeFileSync(DASHBOARD_FILE, dashboard);
console.log(`Dashboard written to ${DASHBOARD_FILE}`);

// Also write daily rollup
const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const rollupFile = path.join(METRICS_DIR, dateStr, 'rollup.json');
// Ensure directory exists (it might not if no events today)
if (!fs.existsSync(path.dirname(rollupFile))) {
    fs.mkdirSync(path.dirname(rollupFile), { recursive: true });
}
fs.writeFileSync(rollupFile, JSON.stringify(metrics, null, 2));
console.log(`Rollup written to ${rollupFile}`);
