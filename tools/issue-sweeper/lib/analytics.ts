/**
 * Advanced Analytics Engine
 *
 * Provides sophisticated analysis, trend detection, and predictions
 */

import { readLedger } from './state.js';
import { LedgerEntry, IssueClassification } from './types.js';
import { loadMetrics } from './metrics.js';

export interface AnalyticsReport {
  summary: AnalyticsSummary;
  trends: TrendAnalysis;
  predictions: Predictions;
  hotspots: Hotspots;
  recommendations: string[];
}

interface AnalyticsSummary {
  totalIssues: number;
  resolvedIssues: number;
  resolveRate: number;
  avgResolutionTime: number;
  mostProductiveHour: number | null;
  mostProductiveDay: string | null;
}

interface TrendAnalysis {
  velocityTrend: 'accelerating' | 'stable' | 'declining';
  qualityTrend: 'improving' | 'stable' | 'declining';
  categoryShifts: Array<{ category: IssueClassification; change: number }>;
  weekOverWeek: {
    issuesProcessed: number;
    issuesFixed: number;
    changePercent: number;
  };
}

interface Predictions {
  estimatedCompletionDate: string | null;
  estimatedRemainingIssues: number;
  projectedSuccessRate: number;
  recommendedBatchSize: number;
}

interface Hotspots {
  topFailureReasons: Array<{ reason: string; count: number }>;
  problematicPatterns: Array<{ pattern: string; failureRate: number }>;
  timeConsumingCategories: Array<{ category: IssueClassification; avgTime: number }>;
}

/**
 * Generate comprehensive analytics report
 */
export function generateAnalytics(): AnalyticsReport {
  const ledger = readLedger();
  const metrics = loadMetrics();

  return {
    summary: analyzeSummary(ledger),
    trends: analyzeTrends(ledger, metrics),
    predictions: generatePredictions(ledger, metrics),
    hotspots: identifyHotspots(ledger),
    recommendations: generateRecommendations(ledger, metrics),
  };
}

/**
 * Analyze summary statistics
 */
function analyzeSummary(ledger: LedgerEntry[]): AnalyticsSummary {
  const totalIssues = ledger.length;
  const resolvedIssues = ledger.filter(
    (e) => e.solved_status === 'solved_in_this_run' || e.solved_status === 'already_solved'
  ).length;

  const resolveRate = totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0;

  // Calculate average resolution time (for solved issues)
  const solvedEntries = ledger.filter(
    (e) => e.solved_status === 'solved_in_this_run' && e.processed_at
  );

  const avgResolutionTime =
    solvedEntries.length > 0
      ? solvedEntries.reduce((sum, e) => {
          // Estimate 15s per issue (from benchmarks)
          return sum + 15000;
        }, 0) / solvedEntries.length
      : 0;

  // Find most productive hour/day
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<string, number> = {};

  for (const entry of ledger) {
    if (!entry.processed_at) continue;

    const date = new Date(entry.processed_at);
    const hour = date.getHours();
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });

    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }

  const mostProductiveHour =
    Object.keys(hourCounts).length > 0
      ? parseInt(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0])
      : null;

  const mostProductiveDay =
    Object.keys(dayCounts).length > 0
      ? Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  return {
    totalIssues,
    resolvedIssues,
    resolveRate,
    avgResolutionTime,
    mostProductiveHour,
    mostProductiveDay,
  };
}

/**
 * Analyze trends over time
 */
function analyzeTrends(ledger: LedgerEntry[], metrics: any): TrendAnalysis {
  const runs = metrics.runs || [];

  // Velocity trend (issues processed per run)
  let velocityTrend: 'accelerating' | 'stable' | 'declining' = 'stable';
  if (runs.length >= 3) {
    const recent = runs.slice(-3).map((r: any) => r.issuesProcessed);
    const avg1 = recent[0];
    const avg2 = (recent[1] + recent[2]) / 2;

    if (avg2 > avg1 * 1.1) velocityTrend = 'accelerating';
    else if (avg2 < avg1 * 0.9) velocityTrend = 'declining';
  }

  // Quality trend (success rate)
  let qualityTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (runs.length >= 3) {
    const recent = runs.slice(-3).map((r: any) => r.successRate);
    const avg1 = recent[0];
    const avg2 = (recent[1] + recent[2]) / 2;

    if (avg2 > avg1 + 5) qualityTrend = 'improving';
    else if (avg2 < avg1 - 5) qualityTrend = 'declining';
  }

  // Category shifts
  const categoryShifts: Array<{ category: IssueClassification; change: number }> = [];
  // Would need historical data to calculate shifts

  // Week-over-week
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentEntries = ledger.filter((e) => new Date(e.processed_at) > weekAgo);
  const olderEntries = ledger.filter((e) => new Date(e.processed_at) <= weekAgo);

  const issuesProcessed = recentEntries.length;
  const issuesFixed = recentEntries.filter(
    (e) => e.solved_status === 'solved_in_this_run' || e.solved_status === 'already_solved'
  ).length;

  const oldIssuesProcessed = Math.max(olderEntries.length, 1);
  const changePercent = ((issuesProcessed - oldIssuesProcessed) / oldIssuesProcessed) * 100;

  return {
    velocityTrend,
    qualityTrend,
    categoryShifts,
    weekOverWeek: {
      issuesProcessed,
      issuesFixed,
      changePercent,
    },
  };
}

/**
 * Generate predictions
 */
function generatePredictions(ledger: LedgerEntry[], metrics: any): Predictions {
  const runs = metrics.runs || [];

  if (runs.length === 0) {
    return {
      estimatedCompletionDate: null,
      estimatedRemainingIssues: 0,
      projectedSuccessRate: 0,
      recommendedBatchSize: 50,
    };
  }

  // Calculate average issues per run
  const avgIssuesPerRun = runs.reduce((sum: number, r: any) => sum + r.issuesProcessed, 0) / runs.length;

  // Calculate average success rate
  const avgSuccessRate = runs.reduce((sum: number, r: any) => sum + r.successRate, 0) / runs.length;

  // Estimate remaining issues (simplified - would need GitHub API)
  const estimatedRemainingIssues = Math.max(1000 - metrics.aggregate.totalIssuesProcessed, 0);

  // Estimate completion date
  const runsNeeded = Math.ceil(estimatedRemainingIssues / avgIssuesPerRun);
  const avgRunDuration = runs.reduce((sum: number, r: any) => sum + r.duration, 0) / runs.length;

  const estimatedTime = runsNeeded * avgRunDuration;
  const completionDate = new Date(Date.now() + estimatedTime);

  // Recommended batch size (optimize for success rate)
  let recommendedBatchSize = 50;
  if (avgSuccessRate < 40) {
    recommendedBatchSize = 25; // Smaller batches for low success
  } else if (avgSuccessRate > 70) {
    recommendedBatchSize = 100; // Larger batches for high success
  }

  return {
    estimatedCompletionDate: completionDate.toISOString(),
    estimatedRemainingIssues,
    projectedSuccessRate: avgSuccessRate,
    recommendedBatchSize,
  };
}

/**
 * Identify hotspots and problem areas
 */
function identifyHotspots(ledger: LedgerEntry[]): Hotspots {
  // Top failure reasons
  const failureReasons: Record<string, number> = {};
  const notSolved = ledger.filter((e) => e.solved_status === 'not_solved');

  for (const entry of notSolved) {
    const reason = entry.evidence.notes || 'Unknown';
    failureReasons[reason] = (failureReasons[reason] || 0) + 1;
  }

  const topFailureReasons = Object.entries(failureReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([reason, count]) => ({ reason, count }));

  // Problematic patterns (categories with low success rates)
  const categoryStats: Record<
    string,
    { total: number; solved: number }
  > = {};

  for (const entry of ledger) {
    if (!categoryStats[entry.classification]) {
      categoryStats[entry.classification] = { total: 0, solved: 0 };
    }

    categoryStats[entry.classification].total++;

    if (
      entry.solved_status === 'solved_in_this_run' ||
      entry.solved_status === 'already_solved'
    ) {
      categoryStats[entry.classification].solved++;
    }
  }

  const problematicPatterns = Object.entries(categoryStats)
    .map(([pattern, stats]) => ({
      pattern,
      failureRate: ((stats.total - stats.solved) / stats.total) * 100,
    }))
    .filter((p) => p.failureRate > 50)
    .sort((a, b) => b.failureRate - a.failureRate);

  // Time-consuming categories (estimated)
  const timeConsumingCategories = Object.entries(categoryStats)
    .map(([category, stats]) => ({
      category: category as IssueClassification,
      avgTime: 15000, // Placeholder - would need actual timing data
    }))
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 5);

  return {
    topFailureReasons,
    problematicPatterns,
    timeConsumingCategories,
  };
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(ledger: LedgerEntry[], metrics: any): string[] {
  const recommendations: string[] = [];
  const analytics = {
    summary: analyzeSummary(ledger),
    trends: analyzeTrends(ledger, metrics),
    hotspots: identifyHotspots(ledger),
  };

  // Success rate recommendations
  if (analytics.summary.resolveRate < 40) {
    recommendations.push(
      '⚠️ Low resolve rate (<40%) - Review fix patterns and improve automation'
    );
  }

  // Velocity recommendations
  if (analytics.trends.velocityTrend === 'declining') {
    recommendations.push(
      '📉 Processing velocity declining - Consider increasing batch size or adding parallel processing'
    );
  }

  // Quality recommendations
  if (analytics.trends.qualityTrend === 'declining') {
    recommendations.push(
      '⚠️ Quality trend declining - Review recent failures and adjust fix patterns'
    );
  }

  // Hotspot recommendations
  if (analytics.hotspots.problematicPatterns.length > 0) {
    const worst = analytics.hotspots.problematicPatterns[0];
    recommendations.push(
      `🔥 High failure rate for "${worst.pattern}" (${worst.failureRate.toFixed(1)}%) - Add custom fix pattern`
    );
  }

  // Top failure reasons
  if (analytics.hotspots.topFailureReasons.length > 0) {
    const topReason = analytics.hotspots.topFailureReasons[0];
    recommendations.push(
      `💡 Most common failure: "${topReason.reason}" (${topReason.count} issues) - Prioritize fixing this pattern`
    );
  }

  // Time optimization
  if (analytics.summary.avgResolutionTime > 20000) {
    recommendations.push(
      '⏱️ Average resolution time >20s - Enable caching or skip verification for faster processing'
    );
  }

  // Positive feedback
  if (analytics.summary.resolveRate > 70) {
    recommendations.push('✅ Excellent resolve rate (>70%) - Consider increasing batch size');
  }

  if (analytics.trends.qualityTrend === 'improving') {
    recommendations.push('📈 Quality improving - Current fix patterns are effective');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ System performing optimally - no immediate actions needed');
  }

  return recommendations;
}

/**
 * Export analytics as JSON
 */
export function exportAnalyticsJSON(): string {
  const analytics = generateAnalytics();
  return JSON.stringify(analytics, null, 2);
}

/**
 * Export analytics as Markdown report
 */
export function exportAnalyticsMarkdown(): string {
  const analytics = generateAnalytics();

  let report = `# Advanced Analytics Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  report += `## Summary\n\n`;
  report += `- **Total Issues:** ${analytics.summary.totalIssues}\n`;
  report += `- **Resolved Issues:** ${analytics.summary.resolvedIssues}\n`;
  report += `- **Resolve Rate:** ${analytics.summary.resolveRate.toFixed(1)}%\n`;
  report += `- **Avg Resolution Time:** ${(analytics.summary.avgResolutionTime / 1000).toFixed(1)}s\n`;
  if (analytics.summary.mostProductiveHour !== null) {
    report += `- **Most Productive Hour:** ${analytics.summary.mostProductiveHour}:00\n`;
  }
  if (analytics.summary.mostProductiveDay) {
    report += `- **Most Productive Day:** ${analytics.summary.mostProductiveDay}\n`;
  }
  report += `\n`;

  report += `## Trends\n\n`;
  report += `- **Velocity:** ${analytics.trends.velocityTrend}\n`;
  report += `- **Quality:** ${analytics.trends.qualityTrend}\n`;
  report += `- **Week-over-Week:**\n`;
  report += `  - Issues Processed: ${analytics.trends.weekOverWeek.issuesProcessed}\n`;
  report += `  - Issues Fixed: ${analytics.trends.weekOverWeek.issuesFixed}\n`;
  report += `  - Change: ${analytics.trends.weekOverWeek.changePercent.toFixed(1)}%\n`;
  report += `\n`;

  report += `## Predictions\n\n`;
  if (analytics.predictions.estimatedCompletionDate) {
    report += `- **Estimated Completion:** ${new Date(analytics.predictions.estimatedCompletionDate).toLocaleDateString()}\n`;
  }
  report += `- **Estimated Remaining:** ${analytics.predictions.estimatedRemainingIssues} issues\n`;
  report += `- **Projected Success Rate:** ${analytics.predictions.projectedSuccessRate.toFixed(1)}%\n`;
  report += `- **Recommended Batch Size:** ${analytics.predictions.recommendedBatchSize}\n`;
  report += `\n`;

  report += `## Hotspots\n\n`;
  report += `### Top Failure Reasons\n\n`;
  for (const reason of analytics.hotspots.topFailureReasons.slice(0, 5)) {
    report += `- ${reason.reason}: ${reason.count} issues\n`;
  }
  report += `\n`;

  report += `### Problematic Patterns\n\n`;
  for (const pattern of analytics.hotspots.problematicPatterns.slice(0, 5)) {
    report += `- ${pattern.pattern}: ${pattern.failureRate.toFixed(1)}% failure rate\n`;
  }
  report += `\n`;

  report += `## Recommendations\n\n`;
  for (const rec of analytics.recommendations) {
    report += `- ${rec}\n`;
  }
  report += `\n`;

  return report;
}
