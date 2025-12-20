#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, no-console */
/**
 * Minimal development gateway stub that exposes health + Prometheus metrics.
 * This keeps the observability stack honest without pulling in the full gateway.
 */
const http = require('node:http');
const os = require('node:os');
const process = require('node:process');

const port = Number(process.env.PORT || 4100);
const hostname = process.env.HOST || '0.0.0.0';

const counters = {
  requests: 0,
  healthChecks: 0,
  metricsRequests: 0,
};

const start = Date.now();

const headers = {
  'content-type': 'application/json',
  'cache-control': 'no-cache',
};

const server = http.createServer((req, res) => {
  counters.requests += 1;
  if (!req.url) {
    res.writeHead(404, headers).end(JSON.stringify({ error: 'unknown route' }));
    return;
  }
  if (req.url.startsWith('/health')) {
    counters.healthChecks += 1;
    res
      .writeHead(200, headers)
      .end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }
  if (req.url.startsWith('/metrics')) {
    counters.metricsRequests += 1;
    res.writeHead(200, {
      'content-type': 'text/plain; version=0.0.4',
      'cache-control': 'no-cache',
    });
    res.end(`# HELP gateway_requests_total Total requests handled by dev gateway
# TYPE gateway_requests_total counter
gateway_requests_total ${counters.requests}
# HELP gateway_health_checks_total Total /health requests handled
# TYPE gateway_health_checks_total counter
gateway_health_checks_total ${counters.healthChecks}
# HELP gateway_metrics_requests_total Total /metrics requests handled
# TYPE gateway_metrics_requests_total counter
gateway_metrics_requests_total ${counters.metricsRequests}
# HELP gateway_uptime_seconds Dev gateway process uptime
# TYPE gateway_uptime_seconds gauge
gateway_uptime_seconds ${((Date.now() - start) / 1000).toFixed(2)}
# HELP gateway_process_resident_memory_bytes Resident memory size in bytes
# TYPE gateway_process_resident_memory_bytes gauge
gateway_process_resident_memory_bytes ${process.memoryUsage().rss}
# HELP gateway_process_cpu_seconds_total Total user+system CPU time in seconds
# TYPE gateway_process_cpu_seconds_total counter
gateway_process_cpu_seconds_total ${process.cpuUsage().user / 1_000_000}
# HELP gateway_info Static labels for the dev gateway
# TYPE gateway_info gauge
gateway_info{hostname="${os.hostname()}"} 1
`);
    return;
  }
  res
    .writeHead(200, headers)
    .end(JSON.stringify({ service: 'dev-gateway', path: req.url }));
});

server.listen(port, hostname, () => {
  console.log(`[dev-gateway] listening on http://${hostname}:${port}`);
});
