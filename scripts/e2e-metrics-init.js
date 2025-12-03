#!/usr/bin/env node

/**
 * E2E Metrics Initialization Script
 *
 * This script initializes the E2E metrics infrastructure by:
 * 1. Creating initial metrics history file if not exists
 * 2. Seeding Prometheus Pushgateway with baseline metrics
 * 3. Validating observability stack connectivity
 *
 * Usage:
 *   node scripts/e2e-metrics-init.js [--seed] [--validate] [--reset]
 *
 * Options:
 *   --seed      Seed pushgateway with initial metrics
 *   --validate  Validate connectivity to observability stack
 *   --reset     Reset metrics history to empty state
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  pushgatewayUrl: process.env.PUSHGATEWAY_URL || 'http://localhost:9091',
  prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',
  grafanaUrl: process.env.GRAFANA_URL || 'http://localhost:3001',
  metricsHistoryPath: path.join(__dirname, '../observability/e2e-metrics-history.json'),
  metricsTrendsPath: path.join(__dirname, '../observability/e2e-trends.json'),
};

// Initial metrics history structure
const INITIAL_HISTORY = {
  runs: [],
  metadata: {
    created: new Date().toISOString(),
    version: '1.0.0',
    sloTarget: 0.995,
    windowDays: 30,
  },
};

// Initial trends structure
const INITIAL_TRENDS = {
  latest: null,
  trends: {
    avg_duration: 0,
    avg_pass_rate: 1,
    total_runs: 0,
    flaky_trend: 0,
  },
  updated: new Date().toISOString(),
};

// Baseline metrics for pushgateway
const BASELINE_METRICS = `
# HELP e2e_test_duration_seconds Total duration of E2E test suite
# TYPE e2e_test_duration_seconds gauge
e2e_test_duration_seconds{suite="golden-path"} 0
e2e_test_duration_seconds{suite="analytics-bridge"} 0
e2e_test_duration_seconds{suite="graph-visualization"} 0
e2e_test_duration_seconds{suite="real-time-updates"} 0

# HELP e2e_tests_passed_total Number of passed tests
# TYPE e2e_tests_passed_total gauge
e2e_tests_passed_total{suite="golden-path"} 0
e2e_tests_passed_total{suite="analytics-bridge"} 0
e2e_tests_passed_total{suite="graph-visualization"} 0
e2e_tests_passed_total{suite="real-time-updates"} 0

# HELP e2e_tests_failed_total Number of failed tests
# TYPE e2e_tests_failed_total gauge
e2e_tests_failed_total{suite="golden-path"} 0
e2e_tests_failed_total{suite="analytics-bridge"} 0
e2e_tests_failed_total{suite="graph-visualization"} 0
e2e_tests_failed_total{suite="real-time-updates"} 0

# HELP e2e_tests_flaky_total Number of flaky tests
# TYPE e2e_tests_flaky_total gauge
e2e_tests_flaky_total{suite="golden-path"} 0
e2e_tests_flaky_total{suite="analytics-bridge"} 0
e2e_tests_flaky_total{suite="graph-visualization"} 0
e2e_tests_flaky_total{suite="real-time-updates"} 0

# HELP e2e_total_duration_seconds Total E2E test duration
# TYPE e2e_total_duration_seconds gauge
e2e_total_duration_seconds 0

# HELP e2e_total_tests_passed Total passed tests across all suites
# TYPE e2e_total_tests_passed gauge
e2e_total_tests_passed 0

# HELP e2e_total_tests_failed Total failed tests across all suites
# TYPE e2e_total_tests_failed gauge
e2e_total_tests_failed 0

# HELP e2e_test_success_rate E2E test success rate
# TYPE e2e_test_success_rate gauge
e2e_test_success_rate 1
`.trim();

/**
 * Colored console output helpers
 */
const log = {
  info: (msg) => console.log(`\x1b[36mℹ\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m✗\x1b[0m ${msg}`),
  section: (msg) => console.log(`\n\x1b[1m${msg}\x1b[0m\n${'─'.repeat(50)}`),
};

/**
 * Initialize metrics history file
 */
function initializeHistory(reset = false) {
  log.section('Initializing Metrics History');

  if (fs.existsSync(CONFIG.metricsHistoryPath) && !reset) {
    log.info(`History file exists: ${CONFIG.metricsHistoryPath}`);
    const history = JSON.parse(fs.readFileSync(CONFIG.metricsHistoryPath, 'utf8'));
    log.success(`Found ${history.runs?.length || 0} historical runs`);
    return;
  }

  // Ensure directory exists
  const dir = path.dirname(CONFIG.metricsHistoryPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log.info(`Created directory: ${dir}`);
  }

  // Write initial history
  fs.writeFileSync(CONFIG.metricsHistoryPath, JSON.stringify(INITIAL_HISTORY, null, 2));
  log.success(`Created metrics history: ${CONFIG.metricsHistoryPath}`);

  // Write initial trends
  fs.writeFileSync(CONFIG.metricsTrendsPath, JSON.stringify(INITIAL_TRENDS, null, 2));
  log.success(`Created metrics trends: ${CONFIG.metricsTrendsPath}`);
}

/**
 * Seed pushgateway with baseline metrics
 */
async function seedPushgateway() {
  log.section('Seeding Pushgateway');

  const url = `${CONFIG.pushgatewayUrl}/metrics/job/e2e_tests`;
  log.info(`Pushing to: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: BASELINE_METRICS,
    });

    if (response.ok) {
      log.success('Baseline metrics pushed successfully');
    } else {
      log.warn(`Pushgateway responded with ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    log.error(`Failed to push metrics: ${error.message}`);
    log.info('Is the pushgateway running? Try: docker compose -f docker-compose.observability.yml up -d pushgateway');
  }
}

/**
 * Validate observability stack connectivity
 */
async function validateConnectivity() {
  log.section('Validating Observability Stack');

  const endpoints = [
    { name: 'Prometheus', url: `${CONFIG.prometheusUrl}/-/healthy` },
    { name: 'Pushgateway', url: `${CONFIG.pushgatewayUrl}/-/healthy` },
    { name: 'Grafana', url: `${CONFIG.grafanaUrl}/api/health` },
  ];

  const results = await Promise.all(
    endpoints.map(async ({ name, url }) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (response.ok) {
          log.success(`${name}: Connected (${url})`);
          return { name, status: 'ok' };
        } else {
          log.warn(`${name}: Unhealthy (${response.status})`);
          return { name, status: 'unhealthy' };
        }
      } catch (error) {
        log.error(`${name}: Unreachable (${url})`);
        return { name, status: 'unreachable' };
      }
    })
  );

  const healthy = results.filter((r) => r.status === 'ok').length;
  console.log();
  log.info(`Connectivity: ${healthy}/${results.length} services healthy`);

  return healthy === results.length;
}

/**
 * Check Prometheus for E2E metrics
 */
async function checkMetrics() {
  log.section('Checking E2E Metrics');

  const query = 'e2e_test_success_rate';
  const url = `${CONFIG.prometheusUrl}/api/v1/query?query=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'success' && data.data.result.length > 0) {
      const value = parseFloat(data.data.result[0].value[1]);
      log.success(`e2e_test_success_rate = ${(value * 100).toFixed(2)}%`);
    } else {
      log.warn('No E2E metrics found yet. Run tests or seed metrics first.');
    }
  } catch (error) {
    log.error(`Failed to query metrics: ${error.message}`);
  }
}

/**
 * Display dashboard links
 */
function displayLinks() {
  log.section('Dashboard Links');

  console.log(`
  📊 E2E Performance Dashboard:
     ${CONFIG.grafanaUrl}/d/e2e-test-performance

  🎯 E2E SLO Dashboard:
     ${CONFIG.grafanaUrl}/d/e2e-slo-dashboard

  📈 Prometheus Targets:
     ${CONFIG.prometheusUrl}/targets

  📤 Pushgateway:
     ${CONFIG.pushgatewayUrl}
  `);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldSeed = args.includes('--seed');
  const shouldValidate = args.includes('--validate');
  const shouldReset = args.includes('--reset');
  const showHelp = args.includes('--help') || args.includes('-h');

  if (showHelp) {
    console.log(`
E2E Metrics Initialization Script

Usage:
  node scripts/e2e-metrics-init.js [options]

Options:
  --seed      Seed pushgateway with initial metrics
  --validate  Validate connectivity to observability stack
  --reset     Reset metrics history to empty state
  --help, -h  Show this help message

Examples:
  # Initialize history and validate connectivity
  node scripts/e2e-metrics-init.js --validate

  # Full initialization with seeding
  node scripts/e2e-metrics-init.js --seed --validate

  # Reset and reinitialize
  node scripts/e2e-metrics-init.js --reset --seed
    `);
    process.exit(0);
  }

  console.log('\n🔭 E2E Observability Initialization\n' + '═'.repeat(50));

  // Initialize history
  initializeHistory(shouldReset);

  // Seed pushgateway if requested
  if (shouldSeed) {
    await seedPushgateway();
  }

  // Validate connectivity if requested
  if (shouldValidate) {
    const allHealthy = await validateConnectivity();
    await checkMetrics();

    if (!allHealthy) {
      log.warn('\nSome services are not healthy. Start the observability stack:');
      console.log('  docker compose -f docker-compose.observability.yml up -d');
    }
  }

  // Always display links
  displayLinks();

  console.log('═'.repeat(50));
  log.success('Initialization complete!\n');
}

main().catch((error) => {
  log.error(`Initialization failed: ${error.message}`);
  process.exit(1);
});
