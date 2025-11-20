/**
 * Enhanced Prometheus Metrics Middleware
 * Comprehensive application metrics for monitoring and alerting
 */

import { Request, Response, NextFunction, Router } from 'express';
import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// HTTP request counter
const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Active connections gauge
const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

// Database query duration
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['database', 'operation'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

// Database connections pool
const dbConnectionsActive = new client.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
  registers: [register],
});

// AI operation metrics
const aiOperationDuration = new client.Histogram({
  name: 'ai_operation_duration_seconds',
  help: 'Duration of AI operations in seconds',
  labelNames: ['operation_type', 'model'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

const aiOperationTotal = new client.Counter({
  name: 'ai_operations_total',
  help: 'Total number of AI operations',
  labelNames: ['operation_type', 'model', 'status'],
  registers: [register],
});

// Business metrics
const casesCreated = new client.Counter({
  name: 'cases_created_total',
  help: 'Total number of cases created',
  labelNames: ['status'],
  registers: [register],
});

const evidenceProcessed = new client.Counter({
  name: 'evidence_processed_total',
  help: 'Total pieces of evidence processed',
  labelNames: ['type'],
  registers: [register],
});

const entitiesCreated = new client.Counter({
  name: 'entities_created_total',
  help: 'Total number of entities created',
  labelNames: ['type'],
  registers: [register],
});

// Cache metrics
const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

// License/authority metrics
const licenseRestrictions = new client.Counter({
  name: 'license_restrictions_total',
  help: 'Total number of operations blocked by license',
  labelNames: ['feature', 'tier'],
  registers: [register],
});

const authorityDenials = new client.Counter({
  name: 'authority_denials_total',
  help: 'Total number of operations denied due to insufficient authority',
  labelNames: ['required_level', 'path'],
  registers: [register],
});

/**
 * Middleware to collect HTTP metrics
 */
export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    activeConnections.inc();

    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;

      httpRequestDuration
        .labels(req.method, route, res.statusCode.toString())
        .observe(duration);

      httpRequestTotal
        .labels(req.method, route, res.statusCode.toString())
        .inc();

      activeConnections.dec();
    });

    next();
  };
}

/**
 * Metrics endpoint
 */
export function createMetricsRouter() {
  const router = Router();

  router.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect metrics' });
    }
  });

  // Health metrics endpoint (JSON format for easier consumption)
  router.get('/metrics/health', async (_req: Request, res: Response) => {
    try {
      const metrics = await register.getMetricsAsJSON();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        metrics: metrics,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect metrics' });
    }
  });

  return router;
}

// Export individual metrics for use in application code
export const metrics = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
  dbQueryDuration,
  dbConnectionsActive,
  aiOperationDuration,
  aiOperationTotal,
  casesCreated,
  evidenceProcessed,
  entitiesCreated,
  cacheHits,
  cacheMisses,
  licenseRestrictions,
  authorityDenials,
};

/**
 * Helper function to record database query metrics
 */
export function recordDbQuery(database: string, operation: string, duration: number) {
  dbQueryDuration.labels(database, operation).observe(duration);
}

/**
 * Helper function to record AI operation metrics
 */
export function recordAiOperation(
  operationType: string,
  model: string,
  duration: number,
  status: 'success' | 'error',
) {
  aiOperationDuration.labels(operationType, model).observe(duration);
  aiOperationTotal.labels(operationType, model, status).inc();
}

/**
 * Helper function to record business metrics
 */
export function recordCaseCreated(status: string) {
  casesCreated.labels(status).inc();
}

export function recordEvidenceProcessed(type: string) {
  evidenceProcessed.labels(type).inc();
}

export function recordEntityCreated(type: string) {
  entitiesCreated.labels(type).inc();
}

/**
 * Helper function to record cache metrics
 */
export function recordCacheHit(cacheType: string) {
  cacheHits.labels(cacheType).inc();
}

export function recordCacheMiss(cacheType: string) {
  cacheMisses.labels(cacheType).inc();
}

/**
 * Helper function to record license/authority denials
 */
export function recordLicenseRestriction(feature: string, tier: string) {
  licenseRestrictions.labels(feature, tier).inc();
}

export function recordAuthorityDenial(requiredLevel: string, path: string) {
  authorityDenials.labels(requiredLevel, path).inc();
}
