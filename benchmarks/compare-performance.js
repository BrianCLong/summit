#!/usr/bin/env node

/**
 * Performance Comparison Tool
 *
 * Compares current metrics against baseline and identifies regressions.
 * Proposes new SLO thresholds when performance characteristics change.
 *
 * Usage:
 *   node compare-performance.js [--baseline baseline.json] [--threshold 10]
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const { URL } = require('url');

// Configuration
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';
const BASELINE_FILE = process.argv.find(arg => arg.startsWith('--baseline'))?.split('=')[1] || 'observability/benchmarks/baseline.json';
const REGRESSION_THRESHOLD = parseFloat(process.argv.find(arg => arg.startsWith('--threshold'))?.split('=')[1] || '10'); // 10% degradation

async function queryPrometheus(query) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${PROMETHEUS_URL}/api/v1/query`);
    url.searchParams.set('query', query);

    const client = url.protocol === 'https:' ? https : http;

    client.get(url.toString(), (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'success') {
            resolve(parsed.data.result);
          } else {
            reject(new Error(`Prometheus query failed: ${parsed.error}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function getCurrentMetrics() {
  const queries = [
    { name: 'golden_path_success_rate', query: 'slo:golden_path:success_ratio:rate1h' },
    { name: 'copilot_latency_p95', query: 'slo:copilot_latency:p95:rate5m' },
    { name: 'ingestion_freshness', query: 'slo:ingestion_freshness:success_ratio:rate1h' },
  ];

  const metrics = {};

  for (const q of queries) {
    try {
      const result = await queryPrometheus(q.query);
      if (result.length > 0 && result[0].value) {
        metrics[q.name] = parseFloat(result[0].value[1]);
      }
    } catch (error) {
      console.error(`Failed to query ${q.name}: ${error.message}`);
    }
  }

  return metrics;
}

async function comparePerformance() {
  console.log('Comparing current performance against baseline...');
  console.log(`  Baseline: ${BASELINE_FILE}`);
  console.log(`  Regression threshold: ${REGRESSION_THRESHOLD}%`);
  console.log('');

  // Load baseline
  if (!fs.existsSync(BASELINE_FILE)) {
    console.error(`❌ Baseline file not found: ${BASELINE_FILE}`);
    console.error('Run generate-baseline.js first to create a baseline.');
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));

  console.log(`Baseline generated: ${baseline.generated_at}`);
  console.log(`Lookback period: ${baseline.lookback_days} days`);
  console.log('');

  // Get current metrics
  const current = await getCurrentMetrics();

  // Compare
  const results = {
    timestamp: new Date().toISOString(),
    regressions: [],
    improvements: [],
    stable: [],
    threshold_recommendations: [],
  };

  console.log('Analysis Results:');
  console.log('========================================');

  for (const [metricName, baselineData] of Object.entries(baseline.metrics)) {
    const currentValue = current[metricName];

    if (currentValue === undefined) {
      console.log(`⚠️  ${metricName}: No current data available`);
      continue;
    }

    const baselineValue = baselineData.statistics.mean;
    const isLatencyMetric = metricName.includes('latency');

    // Calculate percentage change
    const percentChange = isLatencyMetric
      ? ((currentValue - baselineValue) / baselineValue) * 100
      : ((baselineValue - currentValue) / baselineValue) * 100;

    const status = Math.abs(percentChange) < REGRESSION_THRESHOLD
      ? 'stable'
      : percentChange > 0
      ? 'regression'
      : 'improvement';

    const result = {
      metric: metricName,
      description: baselineData.description,
      baseline: baselineValue,
      current: currentValue,
      change_percent: percentChange.toFixed(2),
      status: status,
      target: baselineData.current_target,
      proposed_target: baselineData.proposed_target,
    };

    // Categorize
    if (status === 'regression') {
      results.regressions.push(result);
      console.log(`❌ ${metricName}: REGRESSION`);
    } else if (status === 'improvement') {
      results.improvements.push(result);
      console.log(`✅ ${metricName}: Improved`);
    } else {
      results.stable.push(result);
      console.log(`✓ ${metricName}: Stable`);
    }

    console.log(`   Baseline: ${baselineValue.toFixed(4)}`);
    console.log(`   Current:  ${currentValue.toFixed(4)}`);
    console.log(`   Change:   ${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`);

    // Check if threshold adjustment needed
    if (isLatencyMetric) {
      // For latency: if current consistently higher, recommend raising threshold
      if (currentValue > baselineData.current_target * 1.1) {
        results.threshold_recommendations.push({
          metric: metricName,
          current_target: baselineData.current_target,
          recommended_target: Math.ceil(currentValue * 1.1),
          reason: `Current latency (${currentValue.toFixed(0)}ms) exceeds target by >10%`,
        });
        console.log(`   💡 Recommend raising threshold to ${Math.ceil(currentValue * 1.1)}`);
      }
    } else {
      // For success rate: if current consistently lower, recommend relaxing threshold
      if (currentValue < baselineData.current_target * 0.95) {
        results.threshold_recommendations.push({
          metric: metricName,
          current_target: baselineData.current_target,
          recommended_target: (currentValue * 0.99).toFixed(4),
          reason: `Current success rate (${(currentValue * 100).toFixed(2)}%) below target`,
        });
        console.log(`   💡 Recommend relaxing threshold to ${(currentValue * 0.99 * 100).toFixed(2)}%`);
      }
    }

    console.log('');
  }

  // Summary
  console.log('');
  console.log('Summary:');
  console.log('========================================');
  console.log(`Regressions:   ${results.regressions.length}`);
  console.log(`Improvements:  ${results.improvements.length}`);
  console.log(`Stable:        ${results.stable.length}`);
  console.log(`Threshold recommendations: ${results.threshold_recommendations.length}`);

  // Detailed recommendations
  if (results.threshold_recommendations.length > 0) {
    console.log('');
    console.log('Threshold Recommendations:');
    console.log('========================================');
    results.threshold_recommendations.forEach(rec => {
      console.log(`${rec.metric}:`);
      console.log(`  Current:     ${rec.current_target}`);
      console.log(`  Recommended: ${rec.recommended_target}`);
      console.log(`  Reason:      ${rec.reason}`);
      console.log('');
    });
  }

  // Save results
  const outputFile = BASELINE_FILE.replace('baseline.json', 'comparison-latest.json');
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`Results saved to ${outputFile}`);

  // Exit with error code if regressions detected
  if (results.regressions.length > 0) {
    console.log('');
    console.log('⚠️  Performance regressions detected!');
    process.exit(1);
  }
}

// Run
comparePerformance().catch((error) => {
  console.error('Comparison failed:', error);
  process.exit(1);
});
