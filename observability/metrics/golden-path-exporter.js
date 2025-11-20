#!/usr/bin/env node

/**
 * Golden Path Metrics Exporter
 * Runs smoke tests and exports metrics to Prometheus for SLO tracking
 *
 * This is the "Golden Path" SLO - if this fails, something critical is broken.
 *
 * Usage:
 *   node golden-path-exporter.js [--port 9465] [--interval 30]
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const METRICS_PORT = parseInt(process.env.METRICS_PORT || '9465');
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL_SECONDS || '30') * 1000;
const TIMEOUT_MS = 5000;

// Metrics storage
const metrics = {
  checksTotal: 0,
  checksSuccess: 0,
  checksFailed: 0,
  lastCheckTimestamp: 0,
  lastSuccessTimestamp: 0,
  checkDurations: [], // Store last 100 durations for histogram
  endpointStatus: new Map(), // Track per-endpoint status
};

// Endpoints to check (Golden Path)
const GOLDEN_PATH_ENDPOINTS = [
  { name: 'frontend', url: 'http://localhost:3000', critical: true },
  { name: 'api_health', url: 'http://localhost:4000/health', critical: true },
  { name: 'graphql', url: 'http://localhost:4000/graphql', critical: true, method: 'POST' },
  { name: 'mock_services', url: 'http://localhost:4010/health', critical: false },
  { name: 'worker_health', url: 'http://localhost:4100/health', critical: true },
  { name: 'opa_health', url: 'http://localhost:8181/health', critical: true },
  { name: 'otel_metrics', url: 'http://localhost:9464/metrics', critical: false },
  { name: 'jaeger_ui', url: 'http://localhost:16686', critical: false },
];

// Initialize endpoint metrics
GOLDEN_PATH_ENDPOINTS.forEach(endpoint => {
  metrics.endpointStatus.set(endpoint.name, {
    success: 0,
    failed: 0,
    lastStatus: 'unknown',
    lastDuration: 0,
  });
});

function requestJson(target, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(target);
    const client = url.protocol === 'https:' ? https : http;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers,
      timeout: TIMEOUT_MS,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        resolve({ status: res.statusCode || 0, body: data });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function checkEndpoint(endpoint) {
  const start = Date.now();

  try {
    let response;

    if (endpoint.name === 'graphql') {
      const payload = JSON.stringify({ query: '{ __typename }' });
      response = await requestJson(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        body: payload,
      });

      const parsed = JSON.parse(response.body || '{}');
      const ok = parsed?.data?.__typename === 'Query';

      return {
        endpoint: endpoint.name,
        success: ok,
        duration: Date.now() - start,
        status: response.status,
        critical: endpoint.critical,
      };
    } else {
      response = await requestJson(endpoint.url, { method: endpoint.method || 'GET' });
      const ok = response.status >= 200 && response.status < 400;

      return {
        endpoint: endpoint.name,
        success: ok,
        duration: Date.now() - start,
        status: response.status,
        critical: endpoint.critical,
      };
    }
  } catch (error) {
    return {
      endpoint: endpoint.name,
      success: false,
      duration: Date.now() - start,
      status: 0,
      error: error.message,
      critical: endpoint.critical,
    };
  }
}

async function runGoldenPathCheck() {
  const checkStart = Date.now();
  console.log(`[${new Date().toISOString()}] Running golden path check...`);

  const results = await Promise.all(
    GOLDEN_PATH_ENDPOINTS.map(endpoint => checkEndpoint(endpoint))
  );

  // Update metrics
  metrics.checksTotal++;
  metrics.lastCheckTimestamp = Date.now();

  // Check if golden path succeeded (all critical endpoints up)
  const criticalFailures = results.filter(r => r.critical && !r.success);
  const allSuccess = criticalFailures.length === 0;

  if (allSuccess) {
    metrics.checksSuccess++;
    metrics.lastSuccessTimestamp = Date.now();
  } else {
    metrics.checksFailed++;
  }

  // Store check duration
  const checkDuration = Date.now() - checkStart;
  metrics.checkDurations.push(checkDuration);
  if (metrics.checkDurations.length > 100) {
    metrics.checkDurations.shift();
  }

  // Update per-endpoint metrics
  results.forEach(result => {
    const endpointMetric = metrics.endpointStatus.get(result.endpoint);
    if (result.success) {
      endpointMetric.success++;
      endpointMetric.lastStatus = 'success';
    } else {
      endpointMetric.failed++;
      endpointMetric.lastStatus = 'failed';
    }
    endpointMetric.lastDuration = result.duration;
  });

  // Log results
  console.log(`  Total: ${results.length} | Success: ${results.filter(r => r.success).length} | Failed: ${results.filter(r => !r.success).length}`);

  if (criticalFailures.length > 0) {
    console.log(`  ⚠️  CRITICAL FAILURES:`);
    criticalFailures.forEach(f => {
      console.log(`     - ${f.endpoint}: ${f.error || `HTTP ${f.status}`}`);
    });
  }
}

function generatePrometheusMetrics() {
  const lines = [];

  // Help and type declarations
  lines.push('# HELP summit_golden_path_checks_total Total number of golden path checks');
  lines.push('# TYPE summit_golden_path_checks_total counter');
  lines.push(`summit_golden_path_checks_total{status="total"} ${metrics.checksTotal}`);
  lines.push(`summit_golden_path_checks_total{status="success"} ${metrics.checksSuccess}`);
  lines.push(`summit_golden_path_checks_total{status="failed"} ${metrics.checksFailed}`);

  lines.push('');
  lines.push('# HELP summit_golden_path_last_check_timestamp_seconds Timestamp of last check');
  lines.push('# TYPE summit_golden_path_last_check_timestamp_seconds gauge');
  lines.push(`summit_golden_path_last_check_timestamp_seconds ${metrics.lastCheckTimestamp / 1000}`);

  lines.push('');
  lines.push('# HELP summit_golden_path_last_success_timestamp_seconds Timestamp of last successful check');
  lines.push('# TYPE summit_golden_path_last_success_timestamp_seconds gauge');
  lines.push(`summit_golden_path_last_success_timestamp_seconds ${metrics.lastSuccessTimestamp / 1000}`);

  lines.push('');
  lines.push('# HELP summit_golden_path_success_rate Success rate of golden path checks');
  lines.push('# TYPE summit_golden_path_success_rate gauge');
  const successRate = metrics.checksTotal > 0 ? metrics.checksSuccess / metrics.checksTotal : 0;
  lines.push(`summit_golden_path_success_rate ${successRate.toFixed(4)}`);

  // Per-endpoint metrics
  lines.push('');
  lines.push('# HELP summit_golden_path_endpoint_checks_total Total checks per endpoint');
  lines.push('# TYPE summit_golden_path_endpoint_checks_total counter');

  metrics.endpointStatus.forEach((stat, endpoint) => {
    lines.push(`summit_golden_path_endpoint_checks_total{endpoint="${endpoint}",status="success"} ${stat.success}`);
    lines.push(`summit_golden_path_endpoint_checks_total{endpoint="${endpoint}",status="failed"} ${stat.failed}`);
  });

  lines.push('');
  lines.push('# HELP summit_golden_path_endpoint_status Current endpoint status (1=up, 0=down)');
  lines.push('# TYPE summit_golden_path_endpoint_status gauge');

  metrics.endpointStatus.forEach((stat, endpoint) => {
    const status = stat.lastStatus === 'success' ? 1 : 0;
    lines.push(`summit_golden_path_endpoint_status{endpoint="${endpoint}"} ${status}`);
  });

  lines.push('');
  lines.push('# HELP summit_golden_path_check_duration_seconds Duration of golden path checks');
  lines.push('# TYPE summit_golden_path_check_duration_seconds histogram');

  // Calculate histogram buckets
  const buckets = [0.1, 0.5, 1, 2, 5, 10];
  let cumulativeCount = 0;

  buckets.forEach(bucket => {
    const count = metrics.checkDurations.filter(d => d / 1000 <= bucket).length;
    lines.push(`summit_golden_path_check_duration_seconds_bucket{le="${bucket}"} ${count}`);
  });

  lines.push(`summit_golden_path_check_duration_seconds_bucket{le="+Inf"} ${metrics.checkDurations.length}`);

  const sum = metrics.checkDurations.reduce((a, b) => a + b, 0) / 1000;
  lines.push(`summit_golden_path_check_duration_seconds_sum ${sum.toFixed(3)}`);
  lines.push(`summit_golden_path_check_duration_seconds_count ${metrics.checkDurations.length}`);

  return lines.join('\n') + '\n';
}

// HTTP server for Prometheus scraping
const server = http.createServer((req, res) => {
  if (req.url === '/metrics' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
    res.end(generatePrometheusMetrics());
  } else if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      lastCheck: new Date(metrics.lastCheckTimestamp).toISOString(),
      successRate: metrics.checksTotal > 0 ? (metrics.checksSuccess / metrics.checksTotal) : 0,
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Start server
server.listen(METRICS_PORT, () => {
  console.log(`Golden Path Metrics Exporter started`);
  console.log(`  Metrics endpoint: http://localhost:${METRICS_PORT}/metrics`);
  console.log(`  Health endpoint: http://localhost:${METRICS_PORT}/health`);
  console.log(`  Check interval: ${CHECK_INTERVAL / 1000}s`);
  console.log('');

  // Run first check immediately
  runGoldenPathCheck();

  // Schedule periodic checks
  setInterval(runGoldenPathCheck, CHECK_INTERVAL);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
