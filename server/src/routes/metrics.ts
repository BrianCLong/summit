/**
 * Prometheus Metrics Endpoint
 *
 * Exposes application metrics in Prometheus format at /metrics
 * Integrates with the business-metrics module for custom metrics
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

// Create a new registry
const register = new Registry();

// Add default Node.js metrics
collectDefaultMetrics({
  register,
  prefix: 'intelgraph_',
  labels: { app: 'intelgraph-api', env: process.env.NODE_ENV || 'development' },
});

// ===================================
// HTTP Request Metrics
// ===================================

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code', 'service'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status_code', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpRequestSize = new Histogram({
  name: 'http_request_size_bytes',
  help: 'HTTP request size in bytes',
  labelNames: ['method', 'path'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register],
});

export const httpResponseSize = new Histogram({
  name: 'http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'path'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register],
});

// ===================================
// GraphQL Metrics
// ===================================

export const graphqlRequestsTotal = new Counter({
  name: 'graphql_requests_total',
  help: 'Total number of GraphQL requests',
  labelNames: ['operation_name', 'operation_type'],
  registers: [register],
});

export const graphqlErrorsTotal = new Counter({
  name: 'graphql_errors_total',
  help: 'Total number of GraphQL errors',
  labelNames: ['operation_name', 'error_type'],
  registers: [register],
});

export const graphqlResolverDuration = new Histogram({
  name: 'graphql_resolver_duration_seconds',
  help: 'GraphQL resolver duration in seconds',
  labelNames: ['resolver_name', 'parent_type'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// ===================================
// Database Connection Metrics
// ===================================

export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
  registers: [register],
});

export const dbConnectionsIdle = new Gauge({
  name: 'db_connections_idle',
  help: 'Number of idle database connections',
  labelNames: ['database'],
  registers: [register],
});

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['database', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const dbQueriesTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['database', 'operation', 'status'],
  registers: [register],
});

// ===================================
// Cache Metrics
// ===================================

export const cacheHitsTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache'],
  registers: [register],
});

export const cacheMissesTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache'],
  registers: [register],
});

export const cacheSize = new Gauge({
  name: 'cache_size_bytes',
  help: 'Current cache size in bytes',
  labelNames: ['cache'],
  registers: [register],
});

// ===================================
// Queue Metrics
// ===================================

export const queueJobsTotal = new Counter({
  name: 'queue_jobs_total',
  help: 'Total number of queue jobs',
  labelNames: ['queue', 'status'],
  registers: [register],
});

export const queueJobDuration = new Histogram({
  name: 'queue_job_duration_seconds',
  help: 'Queue job duration in seconds',
  labelNames: ['queue', 'job_type'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600],
  registers: [register],
});

export const queueDepth = new Gauge({
  name: 'queue_depth',
  help: 'Current queue depth (waiting jobs)',
  labelNames: ['queue'],
  registers: [register],
});

// ===================================
// Business Metrics (Gauges updated by scheduled jobs)
// ===================================

export const activeUsersGauge = new Gauge({
  name: 'intelgraph_active_users',
  help: 'Number of active users',
  labelNames: ['tenant_id'],
  registers: [register],
});

export const entitiesTotal = new Gauge({
  name: 'intelgraph_entities_total',
  help: 'Total number of entities',
  labelNames: ['tenant_id', 'entity_type'],
  registers: [register],
});

export const relationshipsTotal = new Gauge({
  name: 'intelgraph_relationships_total',
  help: 'Total number of relationships',
  labelNames: ['tenant_id'],
  registers: [register],
});

export const investigationsActive = new Gauge({
  name: 'intelgraph_investigations_active',
  help: 'Number of active investigations',
  labelNames: ['tenant_id'],
  registers: [register],
});

// ===================================
// Express Middleware for Request Tracking
// ===================================

export function metricsMiddleware() {
  return (req: Request, res: Response, next: () => void) => {
    const start = process.hrtime.bigint();

    // Capture original end to intercept response
    const originalEnd = res.end;
    res.end = function (this: Response, ...args: Parameters<Response['end']>) {
      const duration = Number(process.hrtime.bigint() - start) / 1e9;

      // Normalize path to avoid high cardinality
      const path = normalizePath(req.path);

      // Record metrics
      httpRequestsTotal.inc({
        method: req.method,
        path,
        status_code: res.statusCode.toString(),
        service: 'api',
      });

      httpRequestDuration.observe(
        {
          method: req.method,
          path,
          status_code: res.statusCode.toString(),
          service: 'api',
        },
        duration,
      );

      // Request size
      const contentLength = req.get('content-length');
      if (contentLength) {
        httpRequestSize.observe(
          { method: req.method, path },
          parseInt(contentLength, 10),
        );
      }

      return originalEnd.apply(this, args);
    } as Response['end'];

    next();
  };
}

// Normalize paths to prevent high cardinality (e.g., /entities/123 -> /entities/:id)
function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9]{24}/gi, '/:objectId');
}

// ===================================
// Router
// ===================================

const router = Router();

/**
 * GET /metrics
 * Returns all metrics in Prometheus format
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * GET /metrics/json
 * Returns metrics as JSON for debugging
 */
router.get('/metrics/json', async (_req: Request, res: Response) => {
  try {
    const metrics = await register.getMetricsAsJSON();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Export the registry for use in other modules
export { register };

export default router;
