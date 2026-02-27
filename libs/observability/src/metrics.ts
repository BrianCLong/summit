/**
 * Custom RED + USE metrics and Express middleware for IntelGraph.
 */
import { Counter, Gauge, Histogram, Registry } from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

export const register = new Registry();

// ── RED Metrics (Rate, Errors, Duration) ────────────────────

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.35, 0.5, 0.7, 1, 2, 5],
  registers: [register],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status', 'tenant'] as const,
  registers: [register],
});

export const httpRequestErrorsTotal = new Counter({
  name: 'http_request_errors_total',
  help: 'Total HTTP request errors',
  labelNames: ['method', 'route', 'error_type'] as const,
  registers: [register],
});

// ── Database metrics ────────────────────────────────────────

export const neo4jQueryDuration = new Histogram({
  name: 'neo4j_query_duration_seconds',
  help: 'Neo4j query duration in seconds',
  labelNames: ['query_type', 'hops'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 1.2, 2, 5],
  registers: [register],
});

export const pgQueryDuration = new Histogram({
  name: 'pg_query_duration_seconds',
  help: 'PostgreSQL query duration in seconds',
  labelNames: ['query_type'] as const,
  buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

// ── Ingest metrics ──────────────────────────────────────────

export const ingestEventsTotal = new Counter({
  name: 'ingest_events_total',
  help: 'Total ingested events',
  labelNames: ['connector', 'tenant', 'status'] as const,
  registers: [register],
});

export const graphTraversalsTotal = new Counter({
  name: 'graph_traversals_total',
  help: 'Total graph traversals',
  labelNames: ['hops', 'tenant'] as const,
  registers: [register],
});

// ── USE Metrics (Utilization, Saturation, Errors) ───────────

export const processCpuUsage = new Gauge({
  name: 'process_cpu_usage_ratio',
  help: 'Process CPU usage ratio (0-1)',
  registers: [register],
});

export const processMemoryBytes = new Gauge({
  name: 'process_memory_bytes',
  help: 'Process memory usage in bytes',
  labelNames: ['type'] as const,
  registers: [register],
});

// ── Resource metrics collection ─────────────────────────────

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

function collectResourceMetrics(): void {
  const mem = process.memoryUsage();
  processMemoryBytes.set({ type: 'heap_used' }, mem.heapUsed);
  processMemoryBytes.set({ type: 'heap_total' }, mem.heapTotal);
  processMemoryBytes.set({ type: 'rss' }, mem.rss);

  const currentCpu = process.cpuUsage(lastCpuUsage);
  const elapsed = (Date.now() - lastCpuTime) * 1000; // microseconds
  const cpuPercent = (currentCpu.user + currentCpu.system) / elapsed;
  processCpuUsage.set(Math.min(cpuPercent, 1));

  lastCpuUsage = process.cpuUsage();
  lastCpuTime = Date.now();
}

// Collect every 15s
setInterval(collectResourceMetrics, 15_000);

// ── Express middleware ───────────────────────────────────────

function normalizeRoute(req: Request): string {
  // Use Express route pattern if available, otherwise path
  if (req.route?.path) return req.route.path;
  const path = req.path || req.url;
  // Normalize UUID-like segments
  return path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id',
  );
}

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;
    const method = req.method;
    const route = normalizeRoute(req);
    const status = String(res.statusCode);
    const tenant = (req.headers['x-tenant-id'] as string) || 'unknown';

    httpRequestDuration.observe({ method, route, status }, durationSec);
    httpRequestsTotal.inc({ method, route, status, tenant });

    if (res.statusCode >= 500) {
      httpRequestErrorsTotal.inc({ method, route, error_type: '5xx' });
    } else if (res.statusCode >= 400) {
      httpRequestErrorsTotal.inc({ method, route, error_type: '4xx' });
    }
  });

  next();
}
