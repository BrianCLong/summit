#!/usr/bin/env tsx
/**
 * Benchmark Report Generator
 *
 * Generates comprehensive benchmark reports from evaluation results.
 * Supports multiple output formats: markdown, JSON, HTML.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { BenchmarkReport, EvalMetrics, ScenarioResult } from '../src/types.js';

interface ReportConfig {
  inputPath: string;
  outputPath: string;
  format: 'markdown' | 'json' | 'html';
  includeTraces: boolean;
  compareBaseline?: string;
}

const DEFAULT_CONFIG: ReportConfig = {
  inputPath: './experiments/traces.jsonl',
  outputPath: './benchmark/report.md',
  format: 'markdown',
  includeTraces: false,
};

/**
 * Load traces from JSONL file
 */
function loadTraces(path: string): ScenarioResult[] {
  if (!existsSync(path)) {
    console.error(`Traces file not found: ${path}`);
    return [];
  }

  const content = readFileSync(path, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);

  return lines.map((line) => {
    const trace = JSON.parse(line);
    return {
      scenarioId: trace.scenarioId,
      runId: trace.runId,
      success: trace.summary?.success ?? false,
      metrics: extractMetrics(trace),
      trace,
      errors: [],
      assertions: [],
    };
  });
}

/**
 * Extract metrics from a trace
 */
function extractMetrics(trace: any): EvalMetrics {
  const summary = trace.summary ?? {};
  return {
    taskSuccessRate: summary.success ? 1 : 0,
    taskCompletionTime: summary.totalDurationMs ?? 0,
    totalTokens: summary.totalTokens ?? 0,
    inputTokens: 0,
    outputTokens: 0,
    totalCostUsd: summary.totalCostUsd ?? 0,
    costPerSuccessfulTask: summary.success ? summary.totalCostUsd ?? 0 : 0,
    p50LatencyMs: summary.totalDurationMs ?? 0,
    p95LatencyMs: summary.totalDurationMs ?? 0,
    p99LatencyMs: summary.totalDurationMs ?? 0,
    avgLatencyMs: summary.totalDurationMs ?? 0,
    toolCallCount: summary.toolCallCount ?? 0,
    toolSuccessRate: summary.errorCount === 0 ? 1 : 0,
    avgToolLatencyMs: 0,
    safetyViolationCount: summary.safetyViolations ?? 0,
    safetyViolationRate: 0,
    jailbreakAttempts: 0,
    jailbreakSuccesses: 0,
    routingDecisionCount: 0,
    routingAccuracy: 0,
    costSavingsVsBaseline: 0,
  };
}

/**
 * Calculate aggregate metrics
 */
function aggregateMetrics(results: ScenarioResult[]): EvalMetrics {
  if (results.length === 0) {
    return extractMetrics({});
  }

  const successCount = results.filter((r) => r.success).length;
  const metrics = results.map((r) => r.metrics);

  const sum = (key: keyof EvalMetrics) =>
    metrics.reduce((s, m) => s + (m[key] as number), 0);
  const avg = (key: keyof EvalMetrics) => sum(key) / metrics.length;

  // Calculate latency percentiles
  const latencies = metrics.map((m) => m.avgLatencyMs).sort((a, b) => a - b);
  const percentile = (p: number) =>
    latencies[Math.floor(latencies.length * p)] ?? 0;

  return {
    taskSuccessRate: successCount / results.length,
    taskCompletionTime: sum('taskCompletionTime'),
    totalTokens: sum('totalTokens'),
    inputTokens: sum('inputTokens'),
    outputTokens: sum('outputTokens'),
    totalCostUsd: sum('totalCostUsd'),
    costPerSuccessfulTask:
      successCount > 0 ? sum('totalCostUsd') / successCount : 0,
    p50LatencyMs: percentile(0.5),
    p95LatencyMs: percentile(0.95),
    p99LatencyMs: percentile(0.99),
    avgLatencyMs: avg('avgLatencyMs'),
    toolCallCount: sum('toolCallCount'),
    toolSuccessRate: avg('toolSuccessRate'),
    avgToolLatencyMs: avg('avgToolLatencyMs'),
    safetyViolationCount: sum('safetyViolationCount'),
    safetyViolationRate: sum('safetyViolationCount') / results.length,
    jailbreakAttempts: sum('jailbreakAttempts'),
    jailbreakSuccesses: sum('jailbreakSuccesses'),
    routingDecisionCount: sum('routingDecisionCount'),
    routingAccuracy: avg('routingAccuracy'),
    costSavingsVsBaseline: avg('costSavingsVsBaseline'),
  };
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(
  results: ScenarioResult[],
  metrics: EvalMetrics,
  config: ReportConfig,
): string {
  const lines: string[] = [
    '# Benchmark Report',
    '',
    `**Generated**: ${new Date().toISOString()}`,
    `**Scenarios**: ${results.length}`,
    `**Success Rate**: ${(metrics.taskSuccessRate * 100).toFixed(1)}%`,
    '',
    '---',
    '',
    '## Executive Summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Total Scenarios | ${results.length} |`,
    `| Successful | ${results.filter((r) => r.success).length} |`,
    `| Failed | ${results.filter((r) => !r.success).length} |`,
    `| Success Rate | ${(metrics.taskSuccessRate * 100).toFixed(1)}% |`,
    '',
    '---',
    '',
    '## Cost Metrics',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Total Tokens | ${metrics.totalTokens.toLocaleString()} |`,
    `| Total Cost | $${metrics.totalCostUsd.toFixed(4)} |`,
    `| Cost per Success | $${metrics.costPerSuccessfulTask.toFixed(4)} |`,
    '',
    '---',
    '',
    '## Latency Metrics',
    '',
    '| Percentile | Latency (ms) |',
    '|------------|--------------|',
    `| P50 | ${metrics.p50LatencyMs.toFixed(0)} |`,
    `| P95 | ${metrics.p95LatencyMs.toFixed(0)} |`,
    `| P99 | ${metrics.p99LatencyMs.toFixed(0)} |`,
    `| Average | ${metrics.avgLatencyMs.toFixed(0)} |`,
    '',
    '---',
    '',
    '## Tool Usage',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Total Tool Calls | ${metrics.toolCallCount} |`,
    `| Tool Success Rate | ${(metrics.toolSuccessRate * 100).toFixed(1)}% |`,
    `| Avg Tool Latency | ${metrics.avgToolLatencyMs.toFixed(0)}ms |`,
    '',
    '---',
    '',
    '## Safety Metrics',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Safety Violations | ${metrics.safetyViolationCount} |`,
    `| Violation Rate | ${(metrics.safetyViolationRate * 100).toFixed(1)}% |`,
    `| Jailbreak Attempts | ${metrics.jailbreakAttempts} |`,
    `| Jailbreak Successes | ${metrics.jailbreakSuccesses} |`,
    '',
    '---',
    '',
    '## Scenario Results',
    '',
    '| Scenario ID | Success | Duration (ms) | Tokens | Cost |',
    '|-------------|---------|---------------|--------|------|',
  ];

  for (const result of results) {
    const m = result.metrics;
    lines.push(
      `| ${result.scenarioId} | ${result.success ? '✅' : '❌'} | ${m.taskCompletionTime.toFixed(0)} | ${m.totalTokens} | $${m.totalCostUsd.toFixed(4)} |`,
    );
  }

  lines.push('', '---', '', '## Recommendations', '');

  if (metrics.taskSuccessRate < 0.8) {
    lines.push('- ⚠️ Success rate below 80% - investigate failing scenarios');
  }
  if (metrics.costPerSuccessfulTask > 0.05) {
    lines.push('- ⚠️ Cost per success above $0.05 - consider cost optimization');
  }
  if (metrics.p95LatencyMs > 10000) {
    lines.push('- ⚠️ P95 latency above 10s - investigate slow scenarios');
  }
  if (metrics.safetyViolationRate > 0) {
    lines.push('- 🔴 Safety violations detected - review safety measures');
  }

  if (
    metrics.taskSuccessRate >= 0.9 &&
    metrics.costPerSuccessfulTask <= 0.03 &&
    metrics.p95LatencyMs <= 5000
  ) {
    lines.push('- ✅ All metrics within target ranges');
  }

  return lines.join('\n');
}

/**
 * Generate JSON report
 */
function generateJsonReport(
  results: ScenarioResult[],
  metrics: EvalMetrics,
): string {
  const report: BenchmarkReport = {
    id: `benchmark-${Date.now()}`,
    name: 'Evaluation Benchmark',
    timestamp: new Date().toISOString(),
    config: {
      routerType: 'greedy_cost',
      costWeight: 0.5,
      scenarioCount: results.length,
    },
    aggregateMetrics: metrics,
    scenarioResults: results,
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Generate HTML report
 */
function generateHtmlReport(
  results: ScenarioResult[],
  metrics: EvalMetrics,
): string {
  const successRate = (metrics.taskSuccessRate * 100).toFixed(1);
  const statusColor = metrics.taskSuccessRate >= 0.8 ? '#4caf50' : '#f44336';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Benchmark Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 20px; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
    .metric-card { background: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 2em; font-weight: bold; color: #333; }
    .metric-label { color: #666; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f5f5f5; font-weight: 600; }
    .success { color: #4caf50; }
    .failure { color: #f44336; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; color: white; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Benchmark Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>

    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-value" style="color: ${statusColor}">${successRate}%</div>
        <div class="metric-label">Success Rate</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${results.length}</div>
        <div class="metric-label">Total Scenarios</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">$${metrics.totalCostUsd.toFixed(4)}</div>
        <div class="metric-label">Total Cost</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.p95LatencyMs.toFixed(0)}ms</div>
        <div class="metric-label">P95 Latency</div>
      </div>
    </div>

    <h2>Scenario Results</h2>
    <table>
      <thead>
        <tr>
          <th>Scenario</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Tokens</th>
          <th>Cost</th>
        </tr>
      </thead>
      <tbody>
        ${results
          .map(
            (r) => `
          <tr>
            <td>${r.scenarioId}</td>
            <td class="${r.success ? 'success' : 'failure'}">${r.success ? '✅ Pass' : '❌ Fail'}</td>
            <td>${r.metrics.taskCompletionTime.toFixed(0)}ms</td>
            <td>${r.metrics.totalTokens}</td>
            <td>$${r.metrics.totalCostUsd.toFixed(4)}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const config: ReportConfig = { ...DEFAULT_CONFIG };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
      case '-i':
        config.inputPath = args[++i];
        break;
      case '--output':
      case '-o':
        config.outputPath = args[++i];
        break;
      case '--format':
      case '-f':
        config.format = args[++i] as ReportConfig['format'];
        break;
      case '--traces':
        config.includeTraces = true;
        break;
      case '--baseline':
        config.compareBaseline = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Benchmark Report Generator

Usage: tsx generate-report.ts [options]

Options:
  -i, --input <path>     Input traces file (default: ./experiments/traces.jsonl)
  -o, --output <path>    Output report file (default: ./benchmark/report.md)
  -f, --format <fmt>     Output format: markdown, json, html (default: markdown)
  --traces               Include full traces in JSON output
  --baseline <path>      Compare against baseline results
  -h, --help             Show this help message
`);
        process.exit(0);
    }
  }

  console.log(`Loading traces from: ${config.inputPath}`);
  const results = loadTraces(config.inputPath);

  if (results.length === 0) {
    console.log('No traces found. Generating empty report.');
  }

  console.log(`Found ${results.length} scenario results`);
  const metrics = aggregateMetrics(results);

  let report: string;
  switch (config.format) {
    case 'json':
      report = generateJsonReport(results, metrics);
      break;
    case 'html':
      report = generateHtmlReport(results, metrics);
      break;
    case 'markdown':
    default:
      report = generateMarkdownReport(results, metrics, config);
  }

  // Ensure output directory exists
  mkdirSync(dirname(config.outputPath), { recursive: true });

  writeFileSync(config.outputPath, report);
  console.log(`Report generated: ${config.outputPath}`);
}

main().catch(console.error);
