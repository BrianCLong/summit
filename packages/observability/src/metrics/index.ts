/**
 * CompanyOS Observability SDK - Metrics Module
 *
 * Provides standardized metrics collection following the RED method
 * (Rate, Errors, Duration) and USE method (Utilization, Saturation, Errors).
 *
 * All services MUST emit these standard metrics to be observability-compliant.
 */

import client, {
  Registry,
  Counter,
  Histogram,
  Gauge,
  Summary,
  collectDefaultMetrics,
} from 'prom-client';
import type { ServiceConfig, ServiceArchetype } from '../types/index.js';

// =============================================================================
// METRIC REGISTRIES
// =============================================================================

/** Default registry for all service metrics */
export const registry = new Registry();

/** Standard histogram buckets for different operation types */
export const HISTOGRAM_BUCKETS = {
  /** HTTP request latencies (milliseconds as seconds) */
  http: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  /** Database query latencies */
  database: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  /** Background job durations */
  job: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600],
  /** Cache operations */
  cache: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
  /** External API calls */
  external: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  /** ML inference */
  ml: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
} as const;

// =============================================================================
// STANDARD METRICS (Required for ALL services)
// =============================================================================

/**
 * HTTP Request Metrics - Required for all API services
 */
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['service', 'method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['service', 'method', 'route', 'status_code'],
  buckets: HISTOGRAM_BUCKETS.http,
  registers: [registry],
});

export const httpRequestsInFlight = new Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  labelNames: ['service', 'method'],
  registers: [registry],
});

/**
 * Error Metrics - Required for ALL services
 */
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors by type',
  labelNames: ['service', 'error_type', 'severity'],
  registers: [registry],
});

/**
 * Database Metrics - Required for services using databases
 */
export const dbQueriesTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['service', 'db_system', 'operation', 'status'],
  registers: [registry],
});

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['service', 'db_system', 'operation'],
  buckets: HISTOGRAM_BUCKETS.database,
  registers: [registry],
});

export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['service', 'db_system', 'pool'],
  registers: [registry],
});

export const dbConnectionsIdle = new Gauge({
  name: 'db_connections_idle',
  help: 'Number of idle database connections',
  labelNames: ['service', 'db_system', 'pool'],
  registers: [registry],
});

/**
 * Cache Metrics - Required for services using caching
 */
export const cacheOperationsTotal = new Counter({
  name: 'cache_operations_total',
  help: 'Total cache operations by result',
  labelNames: ['service', 'cache_name', 'operation', 'result'],
  registers: [registry],
});

export const cacheLatency = new Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Cache operation duration in seconds',
  labelNames: ['service', 'cache_name', 'operation'],
  buckets: HISTOGRAM_BUCKETS.cache,
  registers: [registry],
});

/**
 * Queue/Job Metrics - Required for worker services
 */
export const jobsProcessedTotal = new Counter({
  name: 'jobs_processed_total',
  help: 'Total number of jobs processed',
  labelNames: ['service', 'queue', 'job_type', 'status'],
  registers: [registry],
});

export const jobDuration = new Histogram({
  name: 'job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['service', 'queue', 'job_type'],
  buckets: HISTOGRAM_BUCKETS.job,
  registers: [registry],
});

export const jobsInQueue = new Gauge({
  name: 'jobs_in_queue',
  help: 'Number of jobs waiting in queue',
  labelNames: ['service', 'queue', 'priority'],
  registers: [registry],
});

export const jobsInProgress = new Gauge({
  name: 'jobs_in_progress',
  help: 'Number of jobs currently being processed',
  labelNames: ['service', 'queue'],
  registers: [registry],
});

/**
 * External Service Metrics - Required for services calling external APIs
 */
export const externalRequestsTotal = new Counter({
  name: 'external_requests_total',
  help: 'Total number of external service requests',
  labelNames: ['service', 'target_service', 'method', 'status'],
  registers: [registry],
});

export const externalRequestDuration = new Histogram({
  name: 'external_request_duration_seconds',
  help: 'External service request duration in seconds',
  labelNames: ['service', 'target_service', 'method'],
  buckets: HISTOGRAM_BUCKETS.external,
  registers: [registry],
});

/**
 * ML/AI Metrics - Required for ML services
 */
export const mlInferenceTotal = new Counter({
  name: 'ml_inference_total',
  help: 'Total number of ML inference requests',
  labelNames: ['service', 'model', 'version', 'status'],
  registers: [registry],
});

export const mlInferenceDuration = new Histogram({
  name: 'ml_inference_duration_seconds',
  help: 'ML inference duration in seconds',
  labelNames: ['service', 'model', 'version'],
  buckets: HISTOGRAM_BUCKETS.ml,
  registers: [registry],
});

export const mlModelLoadTime = new Gauge({
  name: 'ml_model_load_time_seconds',
  help: 'Time taken to load ML model',
  labelNames: ['service', 'model', 'version'],
  registers: [registry],
});

/**
 * Business Metrics - Custom per service
 */
export const businessEventsTotal = new Counter({
  name: 'business_events_total',
  help: 'Total business events by type',
  labelNames: ['service', 'event_type', 'status'],
  registers: [registry],
});

/**
 * GraphQL Metrics - For GraphQL services
 */
export const graphqlOperationsTotal = new Counter({
  name: 'graphql_operations_total',
  help: 'Total GraphQL operations',
  labelNames: ['service', 'operation_name', 'operation_type'],
  registers: [registry],
});

export const graphqlOperationDuration = new Histogram({
  name: 'graphql_operation_duration_seconds',
  help: 'GraphQL operation duration in seconds',
  labelNames: ['service', 'operation_name', 'operation_type'],
  buckets: HISTOGRAM_BUCKETS.http,
  registers: [registry],
});

export const graphqlErrorsTotal = new Counter({
  name: 'graphql_errors_total',
  help: 'Total GraphQL errors',
  labelNames: ['service', 'operation_name', 'error_code'],
  registers: [registry],
});

export const graphqlResolverDuration = new Histogram({
  name: 'graphql_resolver_duration_seconds',
  help: 'GraphQL resolver duration in seconds',
  labelNames: ['service', 'resolver', 'parent_type'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [registry],
});

// =============================================================================
// METRICS HELPERS
// =============================================================================

export interface MetricsConfig {
  service: ServiceConfig;
  /** Enable Node.js default metrics */
  collectDefaultMetrics?: boolean;
  /** Custom metric prefix */
  prefix?: string;
  /** Custom labels to add to all metrics */
  defaultLabels?: Record<string, string>;
}

/**
 * Initialize metrics collection for a service
 */
export function initializeMetrics(config: MetricsConfig): Registry {
  const { service, collectDefaultMetrics: collectDefault = true, defaultLabels } = config;

  // Set default labels for all metrics
  registry.setDefaultLabels({
    service: service.name,
    environment: service.environment,
    version: service.version,
    ...defaultLabels,
  });

  // Collect Node.js default metrics
  if (collectDefault) {
    collectDefaultMetrics({
      register: registry,
      prefix: 'nodejs_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      eventLoopMonitoringPrecision: 10,
    });
  }

  return registry;
}

/**
 * Record an HTTP request with all standard metrics
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number,
  service: string
): void {
  const labels = { service, method, route, status_code: String(statusCode) };
  httpRequestsTotal.labels(labels).inc();
  httpRequestDuration.labels(labels).observe(durationSeconds);
}

/**
 * Record a database query with all standard metrics
 */
export function recordDbQuery(
  dbSystem: 'postgresql' | 'neo4j' | 'redis' | 'mongodb',
  operation: string,
  durationSeconds: number,
  success: boolean,
  service: string
): void {
  const status = success ? 'success' : 'error';
  dbQueriesTotal.labels({ service, db_system: dbSystem, operation, status }).inc();
  dbQueryDuration.labels({ service, db_system: dbSystem, operation }).observe(durationSeconds);
}

/**
 * Record a cache operation
 */
export function recordCacheOperation(
  cacheName: string,
  operation: 'get' | 'set' | 'delete',
  hit: boolean,
  durationSeconds: number,
  service: string
): void {
  const result = operation === 'get' ? (hit ? 'hit' : 'miss') : 'success';
  cacheOperationsTotal.labels({ service, cache_name: cacheName, operation, result }).inc();
  cacheLatency.labels({ service, cache_name: cacheName, operation }).observe(durationSeconds);
}

/**
 * Record a background job
 */
export function recordJob(
  queue: string,
  jobType: string,
  status: 'completed' | 'failed' | 'retried',
  durationSeconds: number,
  service: string
): void {
  jobsProcessedTotal.labels({ service, queue, job_type: jobType, status }).inc();
  jobDuration.labels({ service, queue, job_type: jobType }).observe(durationSeconds);
}

/**
 * Record an external service call
 */
export function recordExternalCall(
  targetService: string,
  method: string,
  statusCode: number,
  durationSeconds: number,
  service: string
): void {
  const status = statusCode >= 200 && statusCode < 400 ? 'success' : 'error';
  externalRequestsTotal.labels({ service, target_service: targetService, method, status }).inc();
  externalRequestDuration
    .labels({ service, target_service: targetService, method })
    .observe(durationSeconds);
}

/**
 * Record an error
 */
export function recordError(
  errorType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  service: string
): void {
  errorsTotal.labels({ service, error_type: errorType, severity }).inc();
}

/**
 * Record a GraphQL operation
 */
export function recordGraphQLOperation(
  operationName: string,
  operationType: 'query' | 'mutation' | 'subscription',
  durationSeconds: number,
  errorCode?: string,
  service?: string
): void {
  const svc = service || 'unknown';
  graphqlOperationsTotal.labels({ service: svc, operation_name: operationName, operation_type: operationType }).inc();
  graphqlOperationDuration
    .labels({ service: svc, operation_name: operationName, operation_type: operationType })
    .observe(durationSeconds);

  if (errorCode) {
    graphqlErrorsTotal.labels({ service: svc, operation_name: operationName, error_code: errorCode }).inc();
  }
}

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return registry.metrics();
}

/**
 * Get content type for metrics endpoint
 */
export function getMetricsContentType(): string {
  return registry.contentType;
}

// =============================================================================
// ARCHETYPE-SPECIFIC METRIC SETS
// =============================================================================

/**
 * Get required metrics for a service archetype
 */
export function getRequiredMetrics(archetype: ServiceArchetype): string[] {
  const baseMetrics = [
    'http_requests_total',
    'http_request_duration_seconds',
    'errors_total',
  ];

  switch (archetype) {
    case 'api-service':
      return [
        ...baseMetrics,
        'graphql_operations_total',
        'graphql_operation_duration_seconds',
        'graphql_errors_total',
        'db_queries_total',
        'db_query_duration_seconds',
      ];

    case 'gateway-service':
      return [
        ...baseMetrics,
        'http_requests_in_flight',
        'external_requests_total',
        'external_request_duration_seconds',
      ];

    case 'worker-service':
      return [
        'jobs_processed_total',
        'job_duration_seconds',
        'jobs_in_queue',
        'jobs_in_progress',
        'errors_total',
        'db_queries_total',
        'db_query_duration_seconds',
      ];

    case 'data-pipeline':
      return [
        'jobs_processed_total',
        'job_duration_seconds',
        'jobs_in_queue',
        'errors_total',
        'db_queries_total',
        'db_query_duration_seconds',
        'business_events_total',
      ];

    case 'storage-service':
      return [
        ...baseMetrics,
        'db_queries_total',
        'db_query_duration_seconds',
        'db_connections_active',
        'db_connections_idle',
        'cache_operations_total',
        'cache_operation_duration_seconds',
      ];

    case 'ml-service':
      return [
        ...baseMetrics,
        'ml_inference_total',
        'ml_inference_duration_seconds',
        'ml_model_load_time_seconds',
      ];

    default:
      return baseMetrics;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { client, Registry, Counter, Histogram, Gauge, Summary };
