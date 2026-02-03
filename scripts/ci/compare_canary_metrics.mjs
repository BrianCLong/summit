#!/usr/bin/env node
/**
 * Canary Metrics Comparison Script
 *
 * Compares CI metrics between canary (new workflow) and baseline (main workflow)
 * to determine if canary is ready for promotion.
 *
 * Usage:
 *   node compare_canary_metrics.mjs --canary-dir <path> --baseline-dir <path> [--threshold <pct>]
 *
 * Example:
 *   node compare_canary_metrics.mjs \
 *     --canary-dir ./artifacts/canary-metrics \
 *     --baseline-dir ./artifacts/baseline-metrics \
 *     --threshold 5
 *
 * Thresholds (configurable):
 *   - Success rate must not decrease by more than threshold %
 *   - Duration must not increase by more than threshold %
 *   - Queue time must not increase by more than 2x threshold %
 *
 * Authority: docs/ci/CANARY_ROLLOUT.md
 */

import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(name, defaultValue = null) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) {
    return defaultValue;
  }
  return args[idx + 1];
}

const canaryDir = getArg('canary-dir');
const baselineDir = getArg('baseline-dir');
const threshold = parseFloat(getArg('threshold', '5'));
const outputFile = getArg('output', null);
const verbose = args.includes('--verbose');

if (!canaryDir || !baselineDir) {
  console.error('Usage: compare_canary_metrics.mjs --canary-dir <path> --baseline-dir <path>');
  console.error('Options:');
  console.error('  --threshold <pct>  Acceptable degradation percentage (default: 5)');
  console.error('  --output <file>    Write comparison report to file');
  console.error('  --verbose          Show detailed comparison');
  process.exit(1);
}

/**
 * Load all metrics JSON files from a directory
 */
function loadMetricsFromDir(dirPath) {
  const metrics = [];

  if (!fs.existsSync(dirPath)) {
    console.warn(`Directory not found: ${dirPath}`);
    return metrics;
  }

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      metrics.push(data);
    }
  }

  return metrics;
}

/**
 * Calculate aggregate statistics from metrics array
 */
function calculateStats(metrics) {
  if (metrics.length === 0) {
    return null;
  }

  const successRates = metrics.map((m) => m.metrics?.success_rate ?? 0);
  const durations = metrics.map((m) => m.metrics?.duration_minutes ?? 0);
  const queueTimes = metrics.map((m) => m.metrics?.queue_seconds ?? 0);

  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr) => (arr.length > 0 ? sum(arr) / arr.length : 0);
  const median = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const p95 = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[Math.max(0, idx)];
  };

  return {
    count: metrics.length,
    successRate: {
      avg: avg(successRates),
      median: median(successRates),
      min: Math.min(...successRates),
      max: Math.max(...successRates),
    },
    durationMinutes: {
      avg: avg(durations),
      median: median(durations),
      p95: p95(durations),
      min: Math.min(...durations),
      max: Math.max(...durations),
    },
    queueSeconds: {
      avg: avg(queueTimes),
      median: median(queueTimes),
      p95: p95(queueTimes),
    },
  };
}

/**
 * Compare canary vs baseline and determine pass/fail
 */
function compareMetrics(canaryStats, baselineStats, thresholdPct) {
  const checks = [];
  let passed = true;

  // Success rate check (must not decrease by more than threshold)
  const successDelta = canaryStats.successRate.avg - baselineStats.successRate.avg;
  const successCheck = {
    name: 'Success Rate',
    canary: canaryStats.successRate.avg.toFixed(1) + '%',
    baseline: baselineStats.successRate.avg.toFixed(1) + '%',
    delta: (successDelta >= 0 ? '+' : '') + successDelta.toFixed(1) + '%',
    threshold: `-${thresholdPct}%`,
    passed: successDelta >= -thresholdPct,
    critical: true,
  };
  checks.push(successCheck);
  if (!successCheck.passed) {
    passed = false;
  }

  // Duration check (must not increase by more than threshold)
  const durationBaseline = baselineStats.durationMinutes.median;
  const durationCanary = canaryStats.durationMinutes.median;
  const durationDeltaPct = durationBaseline > 0 ? ((durationCanary - durationBaseline) / durationBaseline) * 100 : 0;
  const durationCheck = {
    name: 'Duration (median)',
    canary: durationCanary.toFixed(1) + 'm',
    baseline: durationBaseline.toFixed(1) + 'm',
    delta: (durationDeltaPct >= 0 ? '+' : '') + durationDeltaPct.toFixed(1) + '%',
    threshold: `+${thresholdPct}%`,
    passed: durationDeltaPct <= thresholdPct,
    critical: false,
  };
  checks.push(durationCheck);

  // Queue time check (must not increase by more than 2x threshold)
  const queueBaseline = baselineStats.queueSeconds.median;
  const queueCanary = canaryStats.queueSeconds.median;
  const queueDeltaPct = queueBaseline > 0 ? ((queueCanary - queueBaseline) / queueBaseline) * 100 : 0;
  const queueThreshold = thresholdPct * 2;
  const queueCheck = {
    name: 'Queue Time (median)',
    canary: queueCanary.toFixed(0) + 's',
    baseline: queueBaseline.toFixed(0) + 's',
    delta: (queueDeltaPct >= 0 ? '+' : '') + queueDeltaPct.toFixed(1) + '%',
    threshold: `+${queueThreshold}%`,
    passed: queueDeltaPct <= queueThreshold,
    critical: false,
  };
  checks.push(queueCheck);

  return {
    passed,
    checks,
    summary: {
      canaryRuns: canaryStats.count,
      baselineRuns: baselineStats.count,
      successRateChange: successDelta,
      durationChange: durationDeltaPct,
      queueTimeChange: queueDeltaPct,
    },
  };
}

/**
 * Print comparison report
 */
function printReport(comparison, canaryStats, baselineStats) {
  console.log('\n' + '='.repeat(70));
  console.log('CANARY COMPARISON REPORT');
  console.log('='.repeat(70));
  console.log(`\nCanary runs:   ${canaryStats.count}`);
  console.log(`Baseline runs: ${baselineStats.count}`);
  console.log(`Threshold:     ${threshold}%\n`);

  console.log('Metric'.padEnd(22) + 'Canary'.padEnd(12) + 'Baseline'.padEnd(12) + 'Delta'.padEnd(12) + 'Status');
  console.log('-'.repeat(70));

  for (const check of comparison.checks) {
    const status = check.passed ? '\u2705 PASS' : check.critical ? '\u274C FAIL' : '\u26A0\uFE0F WARN';
    console.log(
      check.name.padEnd(22) + check.canary.padEnd(12) + check.baseline.padEnd(12) + check.delta.padEnd(12) + status
    );
  }

  console.log('-'.repeat(70));

  if (comparison.passed) {
    console.log('\n\u2705 CANARY APPROVED - Ready for promotion to main\n');
  } else {
    console.log('\n\u274C CANARY NOT READY - Address issues before promotion\n');
    console.log('Recommended actions:');
    for (const check of comparison.checks) {
      if (!check.passed && check.critical) {
        console.log(`  - Investigate ${check.name} degradation (${check.delta} vs threshold ${check.threshold})`);
      }
    }
    console.log('');
  }
}

// Main execution
console.log('Loading canary metrics from:', canaryDir);
const canaryMetrics = loadMetricsFromDir(canaryDir);

console.log('Loading baseline metrics from:', baselineDir);
const baselineMetrics = loadMetricsFromDir(baselineDir);

if (canaryMetrics.length === 0) {
  console.error('Error: No canary metrics found');
  process.exit(1);
}

if (baselineMetrics.length === 0) {
  console.error('Error: No baseline metrics found');
  process.exit(1);
}

const canaryStats = calculateStats(canaryMetrics);
const baselineStats = calculateStats(baselineMetrics);

if (verbose) {
  console.log('\nCanary Stats:', JSON.stringify(canaryStats, null, 2));
  console.log('Baseline Stats:', JSON.stringify(baselineStats, null, 2));
}

const comparison = compareMetrics(canaryStats, baselineStats, threshold);
printReport(comparison, canaryStats, baselineStats);

// Write output file if requested
if (outputFile) {
  const report = {
    timestamp: new Date().toISOString(),
    threshold,
    canaryDir,
    baselineDir,
    canaryStats,
    baselineStats,
    comparison,
  };
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
  console.log(`Report written to: ${outputFile}`);
}

// Exit with appropriate code
process.exit(comparison.passed ? 0 : 1);
