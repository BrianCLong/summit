#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASELINE_FILE = path.join(__dirname, '../../perf/baseline.json');
const RESULTS_FILE = process.env.PERF_RESULTS || 'perf-results.json';

if (!fs.existsSync(BASELINE_FILE)) {
  console.error('Baseline file not found:', BASELINE_FILE);
  process.exit(1);
}

if (!fs.existsSync(RESULTS_FILE)) {
  console.error('Results file not found:', RESULTS_FILE);
  console.error('Make sure to run the benchmark first and export results to JSON.');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

function extractMetric(summary, metricName) {
  // k6 summary structure mock:
  // metrics: { http_req_duration: { values: { "p(95)": 123.4 } }, ... }
  // We need to handle deep access safely
  try {
    if (metricName === 'api_latency_p95') {
        // Checking p(95)
        const val = summary.metrics.http_req_duration.values['p(95)'];
        return val !== undefined ? val : null;
    }
    if (metricName === 'api_throughput_rps') {
        const val = summary.metrics.http_reqs.values.rate;
        return val !== undefined ? val : null;
    }
    // Dummy check for queue throughput if present in results
    if (metricName === 'queue_throughput_rps') {
        // Assuming custom metric for queue
        if (summary.metrics.queue_throughput && summary.metrics.queue_throughput.values) {
            return summary.metrics.queue_throughput.values.rate;
        }
        return null;
    }
  } catch (e) {
    return null;
  }
  return null;
}

const currentLatency = extractMetric(results, 'api_latency_p95');
const currentThroughput = extractMetric(results, 'api_throughput_rps');
// Optional: check queue throughput if it exists in baseline
const currentQueueThroughput = extractMetric(results, 'queue_throughput_rps');

console.log('--- Performance Budget Check ---');

let failed = false;

// Helper to check and log
function checkBudget(name, current, baselineVal, isMaxLimit) {
    if (current === null || current === 0) { // Treating 0 as invalid for these metrics
        console.error(`❌ ${name}: Metric missing or zero.`);
        return false;
    }

    console.log(`${name}: Current ${current.toFixed(2)} vs Baseline ${baselineVal}`);

    if (isMaxLimit) {
        // Latency: Fail if current > baseline * 1.1
        if (current > baselineVal * 1.1) {
            console.error(`❌ ${name} Regression! (+10% over baseline)`);
            return false;
        }
    } else {
        // Throughput: Fail if current < baseline * 0.9
        if (current < baselineVal * 0.9) {
            console.error(`❌ ${name} Regression! (-10% under baseline)`);
            return false;
        }
    }
    console.log(`✅ ${name} OK.`);
    return true;
}

if (!checkBudget('Latency P95', currentLatency, baseline.api_latency_p95, true)) failed = true;
if (!checkBudget('API Throughput', currentThroughput, baseline.api_throughput_rps, false)) failed = true;

if (baseline.queue_throughput_rps && currentQueueThroughput !== null) {
    if (!checkBudget('Queue Throughput', currentQueueThroughput, baseline.queue_throughput_rps, false)) failed = true;
}

if (failed) {
  process.exit(1);
}
