#!/usr/bin/env node

/**
 * Baseline Performance Distribution Generator
 *
 * Queries Prometheus for historical SLO metrics and generates
 * baseline performance distributions for threshold tuning.
 *
 * Usage:
 *   node generate-baseline.js [--prometheus-url URL] [--days 28] [--output baseline.json]
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const { URL } = require('url');

// Configuration
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';
const LOOKBACK_DAYS = parseInt(process.argv.find(arg => arg.startsWith('--days'))?.split('=')[1] || '28');
const OUTPUT_FILE = process.argv.find(arg => arg.startsWith('--output'))?.split('=')[1] || 'observability/benchmarks/baseline.json';

// SLO metrics to analyze
const SLO_METRICS = [
  {
    name: 'golden_path_success_rate',
    query: 'slo:golden_path:success_ratio:rate5m',
    target: 0.999,
    description: 'Golden Path success rate',
  },
  {
    name: 'copilot_latency_p95',
    query: 'slo:copilot_latency:p95:rate5m',
    target: 2000, // ms
    description: 'Copilot p95 latency (ms)',
  },
  {
    name: 'ingestion_freshness',
    query: 'slo:ingestion_freshness:success_ratio:rate5m',
    target: 0.95,
    description: 'Ingestion freshness success rate',
  },
];

async function queryPrometheus(query, start, end, step) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${PROMETHEUS_URL}/api/v1/query_range`);
    url.searchParams.set('query', query);
    url.searchParams.set('start', start);
    url.searchParams.set('end', end);
    url.searchParams.set('step', step);

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

function calculateStatistics(values) {
  if (values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p50: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      stddev: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;

  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stddev = Math.sqrt(variance);

  const percentile = (p) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };

  return {
    count: values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: mean,
    median: percentile(50),
    p50: percentile(50),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99),
    stddev: stddev,
  };
}

function generateHistogram(values, buckets = 20) {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const bucketSize = range / buckets;

  const histogram = Array(buckets).fill(0);

  values.forEach(value => {
    const bucketIndex = Math.min(Math.floor((value - min) / bucketSize), buckets - 1);
    histogram[bucketIndex]++;
  });

  return histogram.map((count, i) => ({
    bucket: `${(min + i * bucketSize).toFixed(3)}-${(min + (i + 1) * bucketSize).toFixed(3)}`,
    count: count,
    percentage: ((count / values.length) * 100).toFixed(2),
  }));
}

async function generateBaseline() {
  console.log('Generating baseline performance distributions...');
  console.log(`  Prometheus: ${PROMETHEUS_URL}`);
  console.log(`  Lookback: ${LOOKBACK_DAYS} days`);
  console.log('');

  const now = Math.floor(Date.now() / 1000);
  const start = now - (LOOKBACK_DAYS * 24 * 60 * 60);
  const step = '5m'; // 5-minute resolution

  const baseline = {
    generated_at: new Date().toISOString(),
    lookback_days: LOOKBACK_DAYS,
    prometheus_url: PROMETHEUS_URL,
    metrics: {},
  };

  for (const metric of SLO_METRICS) {
    console.log(`Analyzing ${metric.name}...`);

    try {
      const results = await queryPrometheus(metric.query, start, now, step);

      if (results.length === 0 || !results[0].values) {
        console.log(`  ⚠️  No data available for ${metric.name}`);
        continue;
      }

      // Extract values
      const values = results[0].values.map(([timestamp, value]) => parseFloat(value));

      // Calculate statistics
      const stats = calculateStatistics(values);

      // Generate histogram
      const histogram = generateHistogram(values, 20);

      // Calculate target compliance
      const compliantValues = metric.name.includes('latency')
        ? values.filter(v => v <= metric.target)
        : values.filter(v => v >= metric.target);

      const complianceRate = (compliantValues.length / values.length) * 100;

      // Propose new thresholds based on actual performance
      const proposedTarget = metric.name.includes('latency')
        ? stats.p95  // For latency, use p95
        : stats.p50; // For success rates, use median

      baseline.metrics[metric.name] = {
        description: metric.description,
        current_target: metric.target,
        proposed_target: proposedTarget,
        statistics: stats,
        histogram: histogram,
        compliance: {
          rate: complianceRate.toFixed(2) + '%',
          compliant_samples: compliantValues.length,
          total_samples: values.length,
        },
        recommendation: generateRecommendation(metric, stats, complianceRate),
      };

      console.log(`  ✅ ${metric.name}: p50=${stats.p50.toFixed(3)}, p95=${stats.p95.toFixed(3)}, p99=${stats.p99.toFixed(3)}`);
      console.log(`     Compliance: ${complianceRate.toFixed(1)}%`);

    } catch (error) {
      console.error(`  ❌ Error analyzing ${metric.name}: ${error.message}`);
    }
  }

  // Write to file
  const outputDir = OUTPUT_FILE.substring(0, OUTPUT_FILE.lastIndexOf('/'));
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(baseline, null, 2));
  console.log('');
  console.log(`✅ Baseline saved to ${OUTPUT_FILE}`);

  // Print summary
  console.log('');
  console.log('Summary:');
  console.log('========================================');
  for (const [name, data] of Object.entries(baseline.metrics)) {
    console.log(`${name}:`);
    console.log(`  Current target: ${data.current_target}`);
    console.log(`  Proposed target: ${data.proposed_target.toFixed(3)}`);
    console.log(`  Recommendation: ${data.recommendation}`);
    console.log('');
  }
}

function generateRecommendation(metric, stats, complianceRate) {
  if (complianceRate >= 99.5) {
    return `✅ Excellent performance. Current target (${metric.target}) is achievable. Consider tightening to ${stats.p95.toFixed(3)} for continuous improvement.`;
  } else if (complianceRate >= 95) {
    return `✓ Good performance. Current target is realistic but requires monitoring.`;
  } else if (complianceRate >= 90) {
    return `⚠️  Target occasionally missed. Consider relaxing target to ${stats.p95.toFixed(3)} or investing in performance improvements.`;
  } else {
    return `❌ Target frequently missed (${complianceRate.toFixed(1)}% compliance). Strongly recommend adjusting target to ${stats.p99.toFixed(3)} or prioritizing performance work.`;
  }
}

// Run
generateBaseline().catch((error) => {
  console.error('Failed to generate baseline:', error);
  process.exit(1);
});
