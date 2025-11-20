/**
 * DORA Metrics Exporter
 *
 * Computes DORA (DevOps Research and Assessment) metrics from GitHub:
 * - Deployment Frequency
 * - Lead Time for Changes
 * - Change Failure Rate
 * - Mean Time to Recovery (MTTR)
 *
 * These metrics are used to:
 * 1. Track engineering productivity
 * 2. Compare against industry benchmarks
 * 3. Propose new SLO thresholds based on actual delivery performance
 */

import { Octokit } from 'octokit';
import http from 'http';

const client = new Octokit({ auth: process.env.GH_TOKEN });

const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'BrianCLong';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'summit';
const LOOKBACK_DAYS = parseInt(process.env.DORA_LOOKBACK_DAYS || '28');
const METRICS_PORT = parseInt(process.env.DORA_METRICS_PORT || '9102');
const REFRESH_INTERVAL_MS = parseInt(process.env.DORA_REFRESH_INTERVAL_SECONDS || '300') * 1000; // 5 min default

interface DORAMetrics {
  // Deployment Frequency: How often code is deployed to production
  deployment_frequency_per_day: number;
  total_deployments: number;

  // Lead Time for Changes: Time from commit to production
  lead_time_for_changes_hours: number;
  lead_time_p50_hours: number;
  lead_time_p90_hours: number;
  lead_time_p95_hours: number;

  // Change Failure Rate: % of deployments causing failures
  change_failure_rate: number;
  failed_deployments: number;
  successful_deployments: number;

  // Mean Time to Recovery: Time to recover from failures
  mttr_hours: number;
  mttr_p50_hours: number;
  mttr_p95_hours: number;

  // Additional context
  last_updated: string;
  lookback_days: number;

  // Benchmarking
  performance_tier: 'Elite' | 'High' | 'Medium' | 'Low';
}

let cachedMetrics: DORAMetrics = {
  deployment_frequency_per_day: 0,
  total_deployments: 0,
  lead_time_for_changes_hours: 0,
  lead_time_p50_hours: 0,
  lead_time_p90_hours: 0,
  lead_time_p95_hours: 0,
  change_failure_rate: 0,
  failed_deployments: 0,
  successful_deployments: 0,
  mttr_hours: 0,
  mttr_p50_hours: 0,
  mttr_p95_hours: 0,
  last_updated: new Date().toISOString(),
  lookback_days: LOOKBACK_DAYS,
  performance_tier: 'Low',
};

async function computeDORAMetrics(): Promise<DORAMetrics> {
  console.log(`[${new Date().toISOString()}] Computing DORA metrics...`);

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. Deployment Frequency - from releases/tags
    const { data: releases } = await client.rest.repos.listReleases({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      per_page: 100,
    });

    const recentReleases = releases.filter(r => new Date(r.created_at) >= new Date(since));
    const deploymentFrequency = recentReleases.length / LOOKBACK_DAYS;

    // 2. Lead Time for Changes - from merged PRs
    const { data: pulls } = await client.rest.pulls.list({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    });

    const mergedPRs = pulls.filter(
      pr => pr.merged_at && new Date(pr.merged_at) >= new Date(since)
    );

    const leadTimes = mergedPRs
      .map(pr => {
        if (!pr.created_at || !pr.merged_at) return null;
        const created = new Date(pr.created_at).getTime();
        const merged = new Date(pr.merged_at).getTime();
        return (merged - created) / (1000 * 60 * 60); // hours
      })
      .filter((time): time is number => time !== null);

    const leadTimeP50 = percentile(leadTimes, 50);
    const leadTimeP90 = percentile(leadTimes, 90);
    const leadTimeP95 = percentile(leadTimes, 95);
    const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;

    // 3. Change Failure Rate - from issues labeled as incidents or bugs
    const { data: issues } = await client.rest.issues.listForRepo({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      state: 'all',
      labels: 'incident,bug,production',
      since: since,
      per_page: 100,
    });

    const incidents = issues.filter(
      issue => !issue.pull_request && issue.labels.some(l => typeof l !== 'string' && l.name === 'incident')
    );

    const failedDeployments = incidents.length;
    const successfulDeployments = Math.max(0, recentReleases.length - failedDeployments);
    const changeFailureRate = recentReleases.length > 0 ? failedDeployments / recentReleases.length : 0;

    // 4. Mean Time to Recovery - time to close incident issues
    const closedIncidents = incidents.filter(i => i.closed_at);
    const recoveryTimes = closedIncidents
      .map(issue => {
        if (!issue.created_at || !issue.closed_at) return null;
        const created = new Date(issue.created_at).getTime();
        const closed = new Date(issue.closed_at).getTime();
        return (closed - created) / (1000 * 60 * 60); // hours
      })
      .filter((time): time is number => time !== null);

    const mttrP50 = percentile(recoveryTimes, 50);
    const mttrP95 = percentile(recoveryTimes, 95);
    const avgMTTR = recoveryTimes.length > 0 ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length : 0;

    // Determine performance tier based on DORA benchmarks
    const tier = determinePerformanceTier(deploymentFrequency, avgLeadTime, changeFailureRate, avgMTTR);

    const metrics: DORAMetrics = {
      deployment_frequency_per_day: deploymentFrequency,
      total_deployments: recentReleases.length,
      lead_time_for_changes_hours: avgLeadTime,
      lead_time_p50_hours: leadTimeP50,
      lead_time_p90_hours: leadTimeP90,
      lead_time_p95_hours: leadTimeP95,
      change_failure_rate: changeFailureRate,
      failed_deployments: failedDeployments,
      successful_deployments: successfulDeployments,
      mttr_hours: avgMTTR,
      mttr_p50_hours: mttrP50,
      mttr_p95_hours: mttrP95,
      last_updated: new Date().toISOString(),
      lookback_days: LOOKBACK_DAYS,
      performance_tier: tier,
    };

    console.log(`  Deployment Frequency: ${deploymentFrequency.toFixed(2)}/day`);
    console.log(`  Lead Time (p50): ${leadTimeP50.toFixed(1)}h`);
    console.log(`  Change Failure Rate: ${(changeFailureRate * 100).toFixed(1)}%`);
    console.log(`  MTTR (p50): ${mttrP50.toFixed(1)}h`);
    console.log(`  Performance Tier: ${tier}`);

    return metrics;
  } catch (error) {
    console.error('Failed to compute DORA metrics:', error);
    return cachedMetrics; // Return cached metrics on error
  }
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function determinePerformanceTier(
  deployFreq: number,
  leadTime: number,
  cfr: number,
  mttr: number
): 'Elite' | 'High' | 'Medium' | 'Low' {
  // DORA benchmarks (2023):
  // Elite: Deploy on-demand (multiple/day), lead time < 1 day, CFR < 5%, MTTR < 1 hour
  // High: Deploy weekly-monthly, lead time < 1 week, CFR 5-15%, MTTR < 1 day
  // Medium: Deploy monthly-biannually, lead time 1-6 months, CFR 16-30%, MTTR < 1 week
  // Low: Deploy less than biannually, lead time > 6 months, CFR > 30%, MTTR > 1 week

  let score = 0;

  // Deployment Frequency
  if (deployFreq >= 1) score += 4; // Multiple per day
  else if (deployFreq >= 0.14) score += 3; // Weekly
  else if (deployFreq >= 0.03) score += 2; // Monthly
  else score += 1;

  // Lead Time
  if (leadTime < 24) score += 4; // < 1 day
  else if (leadTime < 168) score += 3; // < 1 week
  else if (leadTime < 720) score += 2; // < 1 month
  else score += 1;

  // Change Failure Rate
  if (cfr < 0.05) score += 4;
  else if (cfr < 0.15) score += 3;
  else if (cfr < 0.30) score += 2;
  else score += 1;

  // MTTR
  if (mttr < 1) score += 4;
  else if (mttr < 24) score += 3;
  else if (mttr < 168) score += 2;
  else score += 1;

  // Average score determines tier
  const avgScore = score / 4;
  if (avgScore >= 3.5) return 'Elite';
  if (avgScore >= 2.5) return 'High';
  if (avgScore >= 1.5) return 'Medium';
  return 'Low';
}

function generatePrometheusMetrics(metrics: DORAMetrics): string {
  const lines: string[] = [];

  // Deployment Frequency
  lines.push('# HELP dora_deployment_frequency_per_day Number of deployments per day');
  lines.push('# TYPE dora_deployment_frequency_per_day gauge');
  lines.push(`dora_deployment_frequency_per_day ${metrics.deployment_frequency_per_day.toFixed(4)}`);

  lines.push('');
  lines.push('# HELP dora_total_deployments Total deployments in lookback period');
  lines.push('# TYPE dora_total_deployments counter');
  lines.push(`dora_total_deployments ${metrics.total_deployments}`);

  // Lead Time for Changes
  lines.push('');
  lines.push('# HELP dora_lead_time_for_changes_hours Average lead time for changes in hours');
  lines.push('# TYPE dora_lead_time_for_changes_hours gauge');
  lines.push(`dora_lead_time_for_changes_hours ${metrics.lead_time_for_changes_hours.toFixed(2)}`);

  lines.push('');
  lines.push('# HELP dora_lead_time_p50_hours P50 lead time in hours');
  lines.push('# TYPE dora_lead_time_p50_hours gauge');
  lines.push(`dora_lead_time_p50_hours ${metrics.lead_time_p50_hours.toFixed(2)}`);

  lines.push('');
  lines.push('# HELP dora_lead_time_p95_hours P95 lead time in hours');
  lines.push('# TYPE dora_lead_time_p95_hours gauge');
  lines.push(`dora_lead_time_p95_hours ${metrics.lead_time_p95_hours.toFixed(2)}`);

  // Change Failure Rate
  lines.push('');
  lines.push('# HELP dora_change_failure_rate Percentage of deployments causing failures');
  lines.push('# TYPE dora_change_failure_rate gauge');
  lines.push(`dora_change_failure_rate ${metrics.change_failure_rate.toFixed(4)}`);

  lines.push('');
  lines.push('# HELP dora_failed_deployments Number of failed deployments');
  lines.push('# TYPE dora_failed_deployments counter');
  lines.push(`dora_failed_deployments ${metrics.failed_deployments}`);

  // MTTR
  lines.push('');
  lines.push('# HELP dora_mttr_hours Mean time to recovery in hours');
  lines.push('# TYPE dora_mttr_hours gauge');
  lines.push(`dora_mttr_hours ${metrics.mttr_hours.toFixed(2)}`);

  lines.push('');
  lines.push('# HELP dora_mttr_p50_hours P50 time to recovery in hours');
  lines.push('# TYPE dora_mttr_p50_hours gauge');
  lines.push(`dora_mttr_p50_hours ${metrics.mttr_p50_hours.toFixed(2)}`);

  // Performance tier (encoded as numeric value)
  const tierValue = { Elite: 4, High: 3, Medium: 2, Low: 1 }[metrics.performance_tier];
  lines.push('');
  lines.push('# HELP dora_performance_tier DORA performance tier (4=Elite, 3=High, 2=Medium, 1=Low)');
  lines.push('# TYPE dora_performance_tier gauge');
  lines.push(`dora_performance_tier ${tierValue}`);

  return lines.join('\n') + '\n';
}

// Refresh metrics periodically
async function refreshMetrics() {
  cachedMetrics = await computeDORAMetrics();
}

// HTTP server for Prometheus scraping
const server = http.createServer((req, res) => {
  if (req.url === '/metrics' && req.method === 'GET') {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.end(generatePrometheusMetrics(cachedMetrics));
  } else if (req.url === '/health' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'healthy',
      last_updated: cachedMetrics.last_updated,
      performance_tier: cachedMetrics.performance_tier,
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(METRICS_PORT, () => {
  console.log(`DORA Metrics Exporter started`);
  console.log(`  Metrics endpoint: http://localhost:${METRICS_PORT}/metrics`);
  console.log(`  Health endpoint: http://localhost:${METRICS_PORT}/health`);
  console.log(`  Repository: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`  Lookback: ${LOOKBACK_DAYS} days`);
  console.log(`  Refresh interval: ${REFRESH_INTERVAL_MS / 1000}s`);
  console.log('');

  // Compute initial metrics
  refreshMetrics();

  // Schedule periodic refresh
  setInterval(refreshMetrics, REFRESH_INTERVAL_MS);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
