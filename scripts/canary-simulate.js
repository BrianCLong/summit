#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function readJson(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Metrics file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

const args = process.argv.slice(2);
let metricsPath;
let outputPath = 'canary-report.json';
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--metrics') {
    metricsPath = args[i + 1];
    i += 1;
  } else if (arg === '--output') {
    outputPath = args[i + 1];
    i += 1;
  }
}

if (!metricsPath) {
  throw new Error('Usage: node scripts/canary-simulate.js --metrics <path> [--output <path>]');
}

const thresholds = {
  api: {
    errorRate: parseFloat(process.env.API_ERROR_BUDGET || '0.001'),
    latencyP99: parseFloat(process.env.API_LATENCY_P99 || '450'),
    saturation: parseFloat(process.env.API_SATURATION || '0.8'),
  },
  ingest: {
    errorRate: parseFloat(process.env.INGEST_ERROR_BUDGET || '0.005'),
    lagSeconds: parseFloat(process.env.INGEST_LAG_SECONDS || '120'),
    minThroughput: parseFloat(process.env.INGEST_MIN_THROUGHPUT || '800'),
  },
};

const metrics = readJson(metricsPath);

const verdict = {
  generatedAt: new Date().toISOString(),
  thresholds,
  metrics,
  failures: [],
};

function compare(name, actual, limit, comparator, message) {
  if (!Number.isFinite(actual)) {
    verdict.failures.push({ component: name, message: `Missing value for ${message}` });
    return;
  }
  if (!comparator(actual, limit)) {
    verdict.failures.push({ component: name, message: `${message} (${actual}) breached limit ${limit}` });
  }
}

const api = metrics.api || {};
compare(
  'api-gateway',
  api.error_rate,
  thresholds.api.errorRate,
  (actual, limit) => actual <= limit,
  'Error rate'
);
compare(
  'api-gateway',
  api.p99_latency_ms,
  thresholds.api.latencyP99,
  (actual, limit) => actual <= limit,
  'p99 latency (ms)'
);
compare(
  'api-gateway',
  api.saturation,
  thresholds.api.saturation,
  (actual, limit) => actual <= limit,
  'Saturation ratio'
);

const ingest = metrics.ingest || {};
compare(
  'ingest-service',
  ingest.error_rate,
  thresholds.ingest.errorRate,
  (actual, limit) => actual <= limit,
  'Error rate'
);
compare(
  'ingest-service',
  ingest.lag_seconds,
  thresholds.ingest.lagSeconds,
  (actual, limit) => actual <= limit,
  'Ingest lag (s)'
);
compare(
  'ingest-service',
  ingest.throughput_per_min,
  thresholds.ingest.minThroughput,
  (actual, limit) => actual >= limit,
  'Throughput / min'
);

verdict.status = verdict.failures.length === 0 ? 'healthy' : 'failed';
if (verdict.status === 'healthy') {
  verdict.summary = 'All canary metrics within guardrails. Proceed to progressive delivery.';
} else {
  verdict.summary = `${verdict.failures.length} canary guardrails violated.`;
}

fs.writeFileSync(outputPath, JSON.stringify(verdict, null, 2));
console.log(`Canary evaluation written to ${outputPath}`);

if (verdict.status !== 'healthy') {
  console.error('Canary checks failed:', JSON.stringify(verdict.failures, null, 2));
  process.exit(1);
}
