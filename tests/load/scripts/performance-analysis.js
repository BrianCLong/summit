#!/usr/bin/env node

/**
 * Performance analysis and regression detection for k6 test results
 * Analyzes k6 JSON output and detects >20% performance regression
 */

const fs = require('fs');
const path = require('path');

const REGRESSION_THRESHOLD = 0.2; // 20% regression threshold

function loadTestResults(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading test results from ${filePath}:`, error.message);
    process.exit(1);
  }
}

function loadBaseline() {
  const baselinePath = path.join(__dirname, '..', 'baseline-performance.json');
  if (fs.existsSync(baselinePath)) {
    try {
      const content = fs.readFileSync(baselinePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Warning: Could not load baseline performance data:', error.message);
    }
  }
  return null;
}

function saveBaseline(metrics) {
  const baselinePath = path.join(__dirname, '..', 'baseline-performance.json');
  const baseline = {
    timestamp: new Date().toISOString(),
    metrics: {
      p95: metrics.p95,
      avg: metrics.avg,
      error_rate: metrics.error_rate,
      throughput: metrics.throughput
    }
  };

  try {
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
    console.log(`✅ Baseline performance data saved to ${baselinePath}`);
  } catch (error) {
    console.warn('Warning: Could not save baseline performance data:', error.message);
  }
}

function extractMetrics(k6Results) {
  const metrics = {
    p95: null,
    avg: null,
    error_rate: null,
    throughput: null,
    duration: null
  };

  // Extract from k6 JSON format
  if (k6Results.metrics) {
    // Response time metrics
    if (k6Results.metrics.http_req_duration) {
      const duration = k6Results.metrics.http_req_duration;
      metrics.p95 = duration.values?.['p(95)'] || duration.thresholds?.['p(95)'];
      metrics.avg = duration.values?.avg || duration.avg;
    }

    // Error rate
    if (k6Results.metrics.http_req_failed) {
      const failed = k6Results.metrics.http_req_failed;
      metrics.error_rate = failed.values?.rate || failed.rate || 0;
    }

    // Throughput (requests per second)
    if (k6Results.metrics.http_reqs) {
      const reqs = k6Results.metrics.http_reqs;
      metrics.throughput = reqs.values?.rate || reqs.rate;
    }

    // Test duration
    if (k6Results.state && k6Results.state.testRunDurationMs) {
      metrics.duration = k6Results.state.testRunDurationMs / 1000; // Convert to seconds
    }
  }

  return metrics;
}

function calculateRegression(current, baseline) {
  const regressions = [];

  // Check p95 latency regression
  if (current.p95 && baseline.p95) {
    const regression = (current.p95 - baseline.p95) / baseline.p95;
    if (regression > REGRESSION_THRESHOLD) {
      regressions.push({
        metric: 'p95 latency',
        current: current.p95,
        baseline: baseline.p95,
        regression: regression * 100,
        status: '❌'
      });
    } else {
      regressions.push({
        metric: 'p95 latency',
        current: current.p95,
        baseline: baseline.p95,
        regression: regression * 100,
        status: '✅'
      });
    }
  }

  // Check average latency regression
  if (current.avg && baseline.avg) {
    const regression = (current.avg - baseline.avg) / baseline.avg;
    if (regression > REGRESSION_THRESHOLD) {
      regressions.push({
        metric: 'avg latency',
        current: current.avg,
        baseline: baseline.avg,
        regression: regression * 100,
        status: '❌'
      });
    } else {
      regressions.push({
        metric: 'avg latency',
        current: current.avg,
        baseline: baseline.avg,
        regression: regression * 100,
        status: '✅'
      });
    }
  }

  // Check throughput regression (lower is worse)
  if (current.throughput && baseline.throughput) {
    const regression = (baseline.throughput - current.throughput) / baseline.throughput;
    if (regression > REGRESSION_THRESHOLD) {
      regressions.push({
        metric: 'throughput',
        current: current.throughput,
        baseline: baseline.throughput,
        regression: regression * 100,
        status: '❌'
      });
    } else {
      regressions.push({
        metric: 'throughput',
        current: current.throughput,
        baseline: baseline.throughput,
        regression: regression * 100,
        status: '✅'
      });
    }
  }

  return regressions;
}

function generateReport(metrics, baseline, regressions) {
  let report = `# 📊 Performance Analysis Report\n\n`;
  report += `**Generated**: ${new Date().toISOString()}\n\n`;

  // Current metrics
  report += `## 🎯 Current Performance Metrics\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  if (metrics.p95) report += `| P95 Latency | ${metrics.p95.toFixed(2)}ms |\n`;
  if (metrics.avg) report += `| Avg Latency | ${metrics.avg.toFixed(2)}ms |\n`;
  if (metrics.error_rate) report += `| Error Rate | ${(metrics.error_rate * 100).toFixed(2)}% |\n`;
  if (metrics.throughput) report += `| Throughput | ${metrics.throughput.toFixed(2)} req/s |\n`;
  if (metrics.duration) report += `| Test Duration | ${(metrics.duration / 60).toFixed(1)} minutes |\n`;

  // Thresholds compliance
  report += `\n## 🎯 Threshold Compliance\n\n`;
  report += `| Threshold | Status |\n`;
  report += `|-----------|--------|\n`;

  const p95Status = metrics.p95 && metrics.p95 <= 1500 ? '✅' : '❌';
  report += `| P95 < 1500ms | ${p95Status} (${metrics.p95?.toFixed(2) || 'N/A'}ms) |\n`;

  const errorStatus = metrics.error_rate && metrics.error_rate <= 0.02 ? '✅' : '❌';
  report += `| Error Rate < 2% | ${errorStatus} (${((metrics.error_rate || 0) * 100).toFixed(2)}%) |\n`;

  // Regression analysis
  if (baseline && regressions.length > 0) {
    report += `\n## 📈 Regression Analysis\n\n`;
    report += `**Baseline**: ${baseline.timestamp}\n\n`;
    report += `| Metric | Current | Baseline | Change | Status |\n`;
    report += `|--------|---------|----------|--------|---------|\n`;

    for (const reg of regressions) {
      const change = reg.regression >= 0 ? `+${reg.regression.toFixed(1)}%` : `${reg.regression.toFixed(1)}%`;
      report += `| ${reg.metric} | ${reg.current?.toFixed(2)} | ${reg.baseline?.toFixed(2)} | ${change} | ${reg.status} |\n`;
    }

    const hasRegression = regressions.some(r => r.status === '❌');
    if (hasRegression) {
      report += `\n**⚠️ Performance regressions detected above 20% threshold!**\n`;
    } else {
      report += `\n**✅ No significant performance regressions detected.**\n`;
    }
  } else {
    report += `\n## 📈 Regression Analysis\n\n`;
    report += `No baseline data available for comparison. Current metrics will be saved as baseline.\n`;
  }

  report += `\n---\n`;
  report += `*Generated by IntelGraph performance analysis*\n`;

  return report;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node performance-analysis.js <k6-results.json>');
    process.exit(1);
  }

  const resultsFile = args[0];
  console.error(`📊 Analyzing performance results from ${resultsFile}...`);

  const k6Results = loadTestResults(resultsFile);
  const baseline = loadBaseline();
  const currentMetrics = extractMetrics(k6Results);

  console.error('Current metrics:', currentMetrics);

  let regressions = [];
  if (baseline && baseline.metrics) {
    regressions = calculateRegression(currentMetrics, baseline.metrics);
    console.error('Regression analysis:', regressions);
  } else {
    console.error('No baseline found, saving current metrics as baseline...');
    saveBaseline(currentMetrics);
  }

  const report = generateReport(currentMetrics, baseline, regressions);
  console.log(report);

  // Exit with error code if performance regressions detected
  const hasRegression = regressions.some(r => r.status === '❌');
  const thresholdViolation = (currentMetrics.p95 && currentMetrics.p95 > 1500) ||
                            (currentMetrics.error_rate && currentMetrics.error_rate > 0.02);

  if (hasRegression || thresholdViolation) {
    console.error('❌ Performance issues detected!');
    process.exit(1);
  } else {
    console.error('✅ Performance within acceptable thresholds');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { extractMetrics, calculateRegression, generateReport };