/**
 * Utility functions for working with evaluation data
 *
 * @module mesh-eval-sdk/utils
 */

import type {
  BaselineComparison,
  BaselineSnapshot,
  EvalRun,
  EvalScore,
  EvalSummary,
  FindingSeverity,
  ImprovementInfo,
  RegressionInfo,
  ScenarioResult,
} from './types.js';

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a unique scenario ID
 */
export function generateScenarioId(type: string, sequence?: number): string {
  const prefix = 'sc';
  const typeSlug = type.toLowerCase().replace(/_/g, '-');
  const seq = sequence ? String(sequence).padStart(3, '0') : generateShortId();
  return `${prefix}-${typeSlug}-${seq}`;
}

/**
 * Generate a unique run ID
 */
export function generateRunId(prefix = 'run'): string {
  const timestamp = Date.now().toString(36);
  const random = generateShortId();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a short random ID
 */
export function generateShortId(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique finding ID
 */
export function generateFindingId(runId: string, scenarioId: string, index: number): string {
  return `finding-${runId}-${scenarioId}-${index}`;
}

// ============================================================================
// Score Calculation
// ============================================================================

/**
 * Calculate overall score from dimension scores
 */
export function calculateOverallScore(
  dimensions: Record<string, number>,
  weights?: Record<string, number>,
): number {
  const keys = Object.keys(dimensions);
  if (keys.length === 0) return 0;

  if (!weights) {
    // Simple average
    const sum = keys.reduce((acc, key) => acc + (dimensions[key] ?? 0), 0);
    return sum / keys.length;
  }

  // Weighted average
  let weightedSum = 0;
  let totalWeight = 0;

  for (const key of keys) {
    const score = dimensions[key] ?? 0;
    const weight = weights[key] ?? 1;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Normalize score to 0-1 range
 */
export function normalizeScore(score: number, min = 0, max = 100): number {
  if (max === min) return 0;
  const normalized = (score - min) / (max - min);
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Determine pass/fail status from score
 */
export function determinePassFail(score: number, threshold = 0.7): 'pass' | 'fail' | 'partial' {
  if (score >= threshold) return 'pass';
  if (score >= threshold * 0.5) return 'partial';
  return 'fail';
}

/**
 * Aggregate scores across multiple scenario results
 */
export function aggregateScores(results: ScenarioResult[]): EvalSummary {
  const total = results.length;
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;
  const errors = results.filter((r) => r.status === 'error').length;

  const passRate = total > 0 ? passed / total : 0;

  const scores = results.map((r) => r.score.overall);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const totalExecutionTime = results.reduce((acc, r) => acc + r.executionTime, 0);
  const totalCost = results.reduce((acc, r) => acc + r.cost, 0);

  const safetyViolations = results.reduce(
    (acc, r) => acc + r.findings.filter((f) => f.type === 'safety_violation').length,
    0,
  );

  const policyDenials = results.reduce(
    (acc, r) => acc + r.policyEvents.filter((e) => e.action === 'deny').length,
    0,
  );

  // Aggregate dimension averages
  const dimensionAverages: Record<string, number> = {};
  const dimensionCounts: Record<string, number> = {};

  for (const result of results) {
    for (const [dim, score] of Object.entries(result.score.dimensions)) {
      if (score !== undefined) {
        dimensionAverages[dim] = (dimensionAverages[dim] ?? 0) + score;
        dimensionCounts[dim] = (dimensionCounts[dim] ?? 0) + 1;
      }
    }
  }

  for (const dim of Object.keys(dimensionAverages)) {
    dimensionAverages[dim] = dimensionAverages[dim] / dimensionCounts[dim];
  }

  return {
    totalScenarios: total,
    passed,
    failed,
    skipped,
    errors,
    passRate,
    avgScore,
    totalExecutionTime,
    totalCost,
    safetyViolations,
    policyDenials,
    dimensionAverages,
  };
}

// ============================================================================
// Baseline Comparison
// ============================================================================

/**
 * Compare an evaluation run against a baseline
 */
export function compareToBaseline(run: EvalRun, baseline: BaselineSnapshot): BaselineComparison {
  const currentMetrics = run.summary.dimensionAverages;
  const baselineMetrics = baseline.metrics;

  const overallDelta = run.summary.avgScore - baseline.metrics.avgCorrectness;

  const dimensionDeltas: Record<string, number> = {};
  for (const [dim, currentScore] of Object.entries(currentMetrics)) {
    const baselineScore = baselineMetrics[dim];
    if (baselineScore !== undefined) {
      dimensionDeltas[dim] = currentScore - baselineScore;
    }
  }

  const regressions: RegressionInfo[] = [];
  const improvements: ImprovementInfo[] = [];

  // Check overall score
  if (overallDelta < 0) {
    regressions.push({
      subject: 'overall',
      metric: 'avgScore',
      baseline: baseline.metrics.avgCorrectness,
      current: run.summary.avgScore,
      delta: overallDelta,
      severity: determineSeverity(Math.abs(overallDelta)),
    });
  } else if (overallDelta > 0) {
    improvements.push({
      subject: 'overall',
      metric: 'avgScore',
      baseline: baseline.metrics.avgCorrectness,
      current: run.summary.avgScore,
      delta: overallDelta,
    });
  }

  // Check dimension deltas
  for (const [dim, delta] of Object.entries(dimensionDeltas)) {
    const baselineScore = baselineMetrics[dim];
    const currentScore = currentMetrics[dim];

    if (baselineScore === undefined || currentScore === undefined) continue;

    if (delta < -0.05) {
      // Regression threshold: -5%
      regressions.push({
        subject: dim,
        metric: 'score',
        baseline: baselineScore,
        current: currentScore,
        delta,
        severity: determineSeverity(Math.abs(delta)),
      });
    } else if (delta > 0.05) {
      // Improvement threshold: +5%
      improvements.push({
        subject: dim,
        metric: 'score',
        baseline: baselineScore,
        current: currentScore,
        delta,
      });
    }
  }

  return {
    current: run.id,
    reference: baseline.id,
    overallDelta,
    dimensionDeltas,
    regressions,
    improvements,
  };
}

/**
 * Determine severity based on magnitude of regression
 */
function determineSeverity(magnitude: number): FindingSeverity {
  if (magnitude >= 0.2) return 'critical';
  if (magnitude >= 0.1) return 'error';
  if (magnitude >= 0.05) return 'warning';
  return 'info';
}

// ============================================================================
// Formatting & Display
// ============================================================================

/**
 * Format a score for display (e.g., 0.856 -> "85.6%")
 */
export function formatScore(score: number, decimals = 1): string {
  return `${(score * 100).toFixed(decimals)}%`;
}

/**
 * Format cost for display (e.g., 0.0042 -> "$0.0042")
 */
export function formatCost(cost: number, decimals = 4): string {
  return `$${cost.toFixed(decimals)}`;
}

/**
 * Format duration for display (e.g., 125000 ms -> "2m 5s")
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date, includeTime = true): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (!includeTime) {
    return `${year}-${month}-${day}`;
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ============================================================================
// Score Aggregation & Analysis
// ============================================================================

/**
 * Calculate percentile of a value in a distribution
 */
export function calculatePercentile(value: number, distribution: number[]): number {
  if (distribution.length === 0) return 0;

  const sorted = [...distribution].sort((a, b) => a - b);
  const index = sorted.findIndex((v) => v >= value);

  if (index === -1) return 100;
  return (index / sorted.length) * 100;
}

/**
 * Calculate statistical summary of scores
 */
export interface StatSummary {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  p50: number;
  p95: number;
  p99: number;
}

export function calculateStats(values: number[]): StatSummary {
  if (values.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, p50: 0, p95: 0, p99: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const median = sorted[Math.floor(n / 2)];
  const min = sorted[0];
  const max = sorted[n - 1];

  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const p50 = sorted[Math.floor(n * 0.5)];
  const p95 = sorted[Math.floor(n * 0.95)];
  const p99 = sorted[Math.floor(n * 0.99)];

  return { mean, median, min, max, stdDev, p50, p95, p99 };
}

// ============================================================================
// Filtering & Querying
// ============================================================================

/**
 * Filter results by status
 */
export function filterByStatus(results: ScenarioResult[], status: string | string[]): ScenarioResult[] {
  const statuses = Array.isArray(status) ? status : [status];
  return results.filter((r) => statuses.includes(r.status));
}

/**
 * Filter results by minimum score
 */
export function filterByMinScore(results: ScenarioResult[], minScore: number): ScenarioResult[] {
  return results.filter((r) => r.score.overall >= minScore);
}

/**
 * Group results by scenario type
 */
export function groupByScenarioType(
  results: ScenarioResult[],
  scenarios: Map<string, { type: string }>,
): Record<string, ScenarioResult[]> {
  const grouped: Record<string, ScenarioResult[]> = {};

  for (const result of results) {
    const scenario = scenarios.get(result.scenarioId);
    if (!scenario) continue;

    const type = scenario.type;
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(result);
  }

  return grouped;
}

// ============================================================================
// Report Generation Helpers
// ============================================================================

/**
 * Generate a markdown summary of an evaluation run
 */
export function generateMarkdownSummary(run: EvalRun): string {
  const { summary } = run;

  const lines = [
    `# Evaluation Run: ${run.id}`,
    '',
    `**Status**: ${run.status}`,
    `**Started**: ${formatTimestamp(run.startedAt)}`,
    run.completedAt ? `**Completed**: ${formatTimestamp(run.completedAt)}` : '',
    `**Environment**: ${run.environment}`,
    run.branch ? `**Branch**: ${run.branch}` : '',
    run.gitCommit ? `**Commit**: ${run.gitCommit}` : '',
    '',
    '## Summary',
    '',
    `- **Total Scenarios**: ${summary.totalScenarios}`,
    `- **Passed**: ${summary.passed} (${formatScore(summary.passRate)})`,
    `- **Failed**: ${summary.failed}`,
    `- **Skipped**: ${summary.skipped}`,
    `- **Errors**: ${summary.errors}`,
    '',
    `- **Average Score**: ${formatScore(summary.avgScore)}`,
    `- **Total Cost**: ${formatCost(summary.totalCost)}`,
    `- **Total Time**: ${formatDuration(summary.totalExecutionTime)}`,
    '',
    `- **Safety Violations**: ${summary.safetyViolations}`,
    `- **Policy Denials**: ${summary.policyDenials}`,
    '',
  ];

  if (Object.keys(summary.dimensionAverages).length > 0) {
    lines.push('## Dimension Scores', '');
    for (const [dim, score] of Object.entries(summary.dimensionAverages)) {
      lines.push(`- **${dim}**: ${formatScore(score)}`);
    }
    lines.push('');
  }

  return lines.filter(Boolean).join('\n');
}

/**
 * Generate a JSON artifact for an evaluation run
 */
export function generateJsonArtifact(run: EvalRun): string {
  return JSON.stringify(run, null, 2);
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a score is valid (0-1 range)
 */
export function isValidScore(score: number): boolean {
  return typeof score === 'number' && score >= 0 && score <= 1 && !isNaN(score);
}

/**
 * Clamp score to valid range
 */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(1, score));
}

/**
 * Validate scenario result completeness
 */
export function isCompleteResult(result: ScenarioResult): boolean {
  return (
    result.scenarioId !== undefined &&
    result.status !== undefined &&
    result.score !== undefined &&
    isValidScore(result.score.overall) &&
    result.executionTime >= 0 &&
    result.cost >= 0
  );
}
