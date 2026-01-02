/**
 * Monitoring and Metrics Module
 *
 * Tracks sweeper performance, success rates, and generates insights.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { LedgerEntry, IssueClassification, SolvedStatus } from './types.js';
import { readLedger } from './state.js';

const METRICS_FILE = join(process.cwd(), 'tools/issue-sweeper/METRICS.json');

export interface Metrics {
  runs: RunMetrics[];
  aggregate: AggregateMetrics;
  lastUpdated: string;
}

export interface RunMetrics {
  runId: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  issuesProcessed: number;
  issuesFixed: number;
  prsCreated: number;
  successRate: number;
  classifications: Record<IssueClassification, number>;
  solvedStatuses: Record<SolvedStatus, number>;
  averageTimePerIssue: number;
  failures: number;
}

export interface AggregateMetrics {
  totalRuns: number;
  totalIssuesProcessed: number;
  totalIssuesFixed: number;
  totalPRsCreated: number;
  overallSuccessRate: number;
  mostCommonClassification: IssueClassification | null;
  mostCommonFailureReason: string | null;
  averageIssuesPerRun: number;
  averageSuccessRate: number;
  patternSuccessRates: Record<string, number>;
}

/**
 * Load metrics from file
 */
export function loadMetrics(): Metrics {
  if (!existsSync(METRICS_FILE)) {
    return {
      runs: [],
      aggregate: {
        totalRuns: 0,
        totalIssuesProcessed: 0,
        totalIssuesFixed: 0,
        totalPRsCreated: 0,
        overallSuccessRate: 0,
        mostCommonClassification: null,
        mostCommonFailureReason: null,
        averageIssuesPerRun: 0,
        averageSuccessRate: 0,
        patternSuccessRates: {},
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const data = readFileSync(METRICS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return loadMetrics(); // Return empty if parsing fails
  }
}

/**
 * Save metrics to file
 */
export function saveMetrics(metrics: Metrics): void {
  metrics.lastUpdated = new Date().toISOString();
  writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2), 'utf-8');
}

/**
 * Record a new run
 */
export function recordRun(
  runId: string,
  startedAt: string,
  completedAt: string
): void {
  const ledger = readLedger();
  const metrics = loadMetrics();

  // Filter entries for this run
  const runEntries = ledger.filter(
    (e) => e.processed_at >= startedAt && e.processed_at <= completedAt
  );

  if (runEntries.length === 0) {
    return; // No entries for this run
  }

  // Calculate run metrics
  const classifications: Record<string, number> = {};
  const solvedStatuses: Record<string, number> = {};

  for (const entry of runEntries) {
    classifications[entry.classification] = (classifications[entry.classification] || 0) + 1;
    solvedStatuses[entry.solved_status] = (solvedStatuses[entry.solved_status] || 0) + 1;
  }

  const issuesFixed =
    (solvedStatuses['solved_in_this_run'] || 0) + (solvedStatuses['already_solved'] || 0);
  const prsCreated = runEntries.filter((e) => e.evidence.prs && e.evidence.prs.length > 0).length;
  const failures = runEntries.filter((e) => e.solved_status === 'not_solved').length;

  const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const averageTimePerIssue = duration / runEntries.length;
  const successRate = (issuesFixed / runEntries.length) * 100;

  const runMetrics: RunMetrics = {
    runId,
    startedAt,
    completedAt,
    duration,
    issuesProcessed: runEntries.length,
    issuesFixed,
    prsCreated,
    successRate,
    classifications: classifications as any,
    solvedStatuses: solvedStatuses as any,
    averageTimePerIssue,
    failures,
  };

  metrics.runs.push(runMetrics);

  // Update aggregate metrics
  updateAggregateMetrics(metrics);

  saveMetrics(metrics);
}

/**
 * Update aggregate metrics
 */
function updateAggregateMetrics(metrics: Metrics): void {
  const { runs } = metrics;

  if (runs.length === 0) {
    return;
  }

  metrics.aggregate.totalRuns = runs.length;
  metrics.aggregate.totalIssuesProcessed = runs.reduce((sum, r) => sum + r.issuesProcessed, 0);
  metrics.aggregate.totalIssuesFixed = runs.reduce((sum, r) => sum + r.issuesFixed, 0);
  metrics.aggregate.totalPRsCreated = runs.reduce((sum, r) => sum + r.prsCreated, 0);

  // Overall success rate
  metrics.aggregate.overallSuccessRate =
    (metrics.aggregate.totalIssuesFixed / metrics.aggregate.totalIssuesProcessed) * 100;

  // Average success rate across runs
  metrics.aggregate.averageSuccessRate =
    runs.reduce((sum, r) => sum + r.successRate, 0) / runs.length;

  // Average issues per run
  metrics.aggregate.averageIssuesPerRun = metrics.aggregate.totalIssuesProcessed / runs.length;

  // Most common classification
  const allClassifications: Record<string, number> = {};
  for (const run of runs) {
    for (const [classification, count] of Object.entries(run.classifications)) {
      allClassifications[classification] = (allClassifications[classification] || 0) + count;
    }
  }

  const mostCommon = Object.entries(allClassifications).sort((a, b) => b[1] - a[1])[0];
  metrics.aggregate.mostCommonClassification = mostCommon ? (mostCommon[0] as any) : null;
}

/**
 * Generate metrics report
 */
export function generateMetricsReport(): string {
  const metrics = loadMetrics();
  const { aggregate, runs } = metrics;

  let report = `# Issue Sweeper - Performance Metrics\n\n`;
  report += `**Last Updated:** ${metrics.lastUpdated}\n\n`;

  report += `## Aggregate Statistics\n\n`;
  report += `- **Total Runs:** ${aggregate.totalRuns}\n`;
  report += `- **Total Issues Processed:** ${aggregate.totalIssuesProcessed}\n`;
  report += `- **Total Issues Fixed:** ${aggregate.totalIssuesFixed}\n`;
  report += `- **Total PRs Created:** ${aggregate.totalPRsCreated}\n`;
  report += `- **Overall Success Rate:** ${aggregate.overallSuccessRate.toFixed(2)}%\n`;
  report += `- **Average Success Rate:** ${aggregate.averageSuccessRate.toFixed(2)}%\n`;
  report += `- **Average Issues/Run:** ${aggregate.averageIssuesPerRun.toFixed(1)}\n`;
  report += `- **Most Common Classification:** ${aggregate.mostCommonClassification || 'N/A'}\n`;
  report += `\n`;

  if (runs.length > 0) {
    report += `## Recent Runs (Last 10)\n\n`;

    const recentRuns = runs.slice(-10).reverse();
    for (const run of recentRuns) {
      report += `### Run ${run.runId}\n`;
      report += `- **Started:** ${new Date(run.startedAt).toLocaleString()}\n`;
      report += `- **Duration:** ${formatDuration(run.duration)}\n`;
      report += `- **Issues Processed:** ${run.issuesProcessed}\n`;
      report += `- **Issues Fixed:** ${run.issuesFixed}\n`;
      report += `- **PRs Created:** ${run.prsCreated}\n`;
      report += `- **Success Rate:** ${run.successRate.toFixed(2)}%\n`;
      report += `- **Avg Time/Issue:** ${(run.averageTimePerIssue / 1000).toFixed(1)}s\n`;
      report += `- **Failures:** ${run.failures}\n`;
      report += `\n`;
    }
  }

  report += `## Success Rates by Classification\n\n`;
  const classificationStats = calculateClassificationStats();
  for (const [classification, stats] of Object.entries(classificationStats)) {
    report += `- **${classification}:** ${stats.successRate.toFixed(1)}% (${stats.fixed}/${stats.total})\n`;
  }

  report += `\n## Trends\n\n`;
  report += generateTrends(runs);

  return report;
}

/**
 * Calculate success rates by classification
 */
function calculateClassificationStats(): Record<
  string,
  { total: number; fixed: number; successRate: number }
> {
  const ledger = readLedger();
  const stats: Record<string, { total: number; fixed: number }> = {};

  for (const entry of ledger) {
    if (!stats[entry.classification]) {
      stats[entry.classification] = { total: 0, fixed: 0 };
    }

    stats[entry.classification].total++;

    if (
      entry.solved_status === 'solved_in_this_run' ||
      entry.solved_status === 'already_solved'
    ) {
      stats[entry.classification].fixed++;
    }
  }

  const result: Record<string, { total: number; fixed: number; successRate: number }> = {};
  for (const [classification, { total, fixed }] of Object.entries(stats)) {
    result[classification] = {
      total,
      fixed,
      successRate: (fixed / total) * 100,
    };
  }

  return result;
}

/**
 * Generate trend analysis
 */
function generateTrends(runs: RunMetrics[]): string {
  if (runs.length < 2) {
    return 'Not enough data for trend analysis.\n';
  }

  let trends = '';

  // Success rate trend
  const recentSuccessRate = runs.slice(-5).reduce((sum, r) => sum + r.successRate, 0) / 5;
  const olderSuccessRate = runs.slice(-10, -5).reduce((sum, r) => sum + r.successRate, 0) / 5;

  if (recentSuccessRate > olderSuccessRate) {
    trends += `- ✅ Success rate **improving** (${olderSuccessRate.toFixed(1)}% → ${recentSuccessRate.toFixed(1)}%)\n`;
  } else if (recentSuccessRate < olderSuccessRate) {
    trends += `- ⚠️  Success rate **declining** (${olderSuccessRate.toFixed(1)}% → ${recentSuccessRate.toFixed(1)}%)\n`;
  } else {
    trends += `- ➡️  Success rate **stable** (~${recentSuccessRate.toFixed(1)}%)\n`;
  }

  // Processing speed trend
  const recentSpeed = runs.slice(-5).reduce((sum, r) => sum + r.averageTimePerIssue, 0) / 5;
  const olderSpeed = runs.slice(-10, -5).reduce((sum, r) => sum + r.averageTimePerIssue, 0) / 5;

  if (recentSpeed < olderSpeed) {
    trends += `- ✅ Processing speed **improving** (${(olderSpeed / 1000).toFixed(1)}s → ${(recentSpeed / 1000).toFixed(1)}s/issue)\n`;
  } else if (recentSpeed > olderSpeed) {
    trends += `- ⚠️  Processing speed **slowing** (${(olderSpeed / 1000).toFixed(1)}s → ${(recentSpeed / 1000).toFixed(1)}s/issue)\n`;
  } else {
    trends += `- ➡️  Processing speed **stable** (~${(recentSpeed / 1000).toFixed(1)}s/issue)\n`;
  }

  return trends;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Get performance insights
 */
export function getPerformanceInsights(): string[] {
  const metrics = loadMetrics();
  const insights: string[] = [];

  // Check if success rate is low
  if (metrics.aggregate.overallSuccessRate < 50) {
    insights.push('⚠️  Success rate below 50% - consider improving fix patterns');
  }

  // Check if processing is slow
  const avgTimePerIssue =
    metrics.runs.reduce((sum, r) => sum + r.averageTimePerIssue, 0) / metrics.runs.length;
  if (avgTimePerIssue > 30000) {
    // 30 seconds
    insights.push('⚠️  Average processing time >30s/issue - consider optimization');
  }

  // Check if there are many failures
  const failureRate =
    (metrics.runs.reduce((sum, r) => sum + r.failures, 0) /
      metrics.aggregate.totalIssuesProcessed) *
    100;
  if (failureRate > 30) {
    insights.push(`⚠️  High failure rate (${failureRate.toFixed(1)}%) - review failure patterns`);
  }

  // Check if PR creation rate is low
  const prRate = (metrics.aggregate.totalPRsCreated / metrics.aggregate.totalIssuesFixed) * 100;
  if (prRate < 50 && metrics.aggregate.totalIssuesFixed > 0) {
    insights.push(
      `ℹ️  Only ${prRate.toFixed(1)}% of fixes resulted in PRs - consider enabling --auto-pr`
    );
  }

  if (insights.length === 0) {
    insights.push('✅ Performance looks good!');
  }

  return insights;
}

/**
 * Export metrics for external analysis
 */
export function exportMetricsCSV(): string {
  const runs = loadMetrics().runs;

  let csv = 'Run ID,Started,Duration (ms),Issues Processed,Issues Fixed,PRs Created,Success Rate,Avg Time/Issue (ms),Failures\n';

  for (const run of runs) {
    csv += `${run.runId},${run.startedAt},${run.duration},${run.issuesProcessed},${run.issuesFixed},${run.prsCreated},${run.successRate},${run.averageTimePerIssue},${run.failures}\n`;
  }

  return csv;
}
