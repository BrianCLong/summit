/**
 * @companyos/observability
 *
 * CompanyOS Observability SDK - Unified observability for all services
 *
 * This package provides:
 * - Standardized metrics (RED + USE methodology)
 * - Structured logging with trace correlation
 * - Distributed tracing (OpenTelemetry)
 * - SLO management and error budget tracking
 * - Health check utilities
 * - Express middleware for automatic instrumentation
 *
 * @example
 * ```typescript
 * import {
 *   initializeObservability,
 *   createLogger,
 *   withSpan,
 *   recordHttpRequest,
 * } from '@companyos/observability';
 *
 * // Initialize observability for your service
 * await initializeObservability({
 *   service: {
 *     name: 'my-api',
 *     version: '1.0.0',
 *     environment: 'production',
 *   },
 *   archetype: 'api-service',
 * });
 *
 * // Create a logger
 * const logger = createLogger({ service: config.service });
 *
 * // Use distributed tracing
 * await withSpan('my-operation', async (span) => {
 *   span.setAttribute('key', 'value');
 *   // ... your code
 * });
 * ```
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  ServiceConfig,
  ServiceArchetype,
  MetricType,
  MetricDefinition,
  StandardLabels,
  HttpLabels,
  DatabaseLabels,
  QueueLabels,
  CacheLabels,
  LogLevel,
  LogContext,
  LogEntry,
  SpanKind,
  SpanContext,
  SpanAttributes,
  TracingConfig,
  SloType,
  SloDefinition,
  ErrorBudget,
  HealthStatus,
  HealthCheck,
  HealthReport,
  ArchetypeConfig,
  AuditEvent,
  ObservabilityContract,
} from './types/index.js';

// =============================================================================
// METRICS EXPORTS
// =============================================================================

export {
  // Registry
  registry,
  // Standard metrics
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsInFlight,
  errorsTotal,
  dbQueriesTotal,
  dbQueryDuration,
  dbConnectionsActive,
  dbConnectionsIdle,
  cacheOperationsTotal,
  cacheLatency,
  jobsProcessedTotal,
  jobDuration,
  jobsInQueue,
  jobsInProgress,
  externalRequestsTotal,
  externalRequestDuration,
  mlInferenceTotal,
  mlInferenceDuration,
  mlModelLoadTime,
  businessEventsTotal,
  graphqlOperationsTotal,
  graphqlOperationDuration,
  graphqlErrorsTotal,
  graphqlResolverDuration,
  // Histogram buckets
  HISTOGRAM_BUCKETS,
  // Helper functions
  initializeMetrics,
  recordHttpRequest,
  recordDbQuery,
  recordCacheOperation,
  recordJob,
  recordExternalCall,
  recordError,
  recordGraphQLOperation,
  getMetrics,
  getMetricsContentType,
  getRequiredMetrics,
  // prom-client re-exports
  client,
  Registry,
  Counter,
  Histogram,
  Gauge,
  Summary,
} from './metrics/index.js';

// =============================================================================
// LOGGING EXPORTS
// =============================================================================

export {
  createLogger,
  withTraceContext,
  createRequestLogger,
  createOperationLogger,
  createAuditLogger,
  AuditLogger,
  mapLogLevel,
  isLevelEnabled,
  logError,
  logWarning,
  type Logger,
  type LoggerOptions,
  type LoggingConfig,
  type ErrorLogContext,
} from './logging/index.js';

// =============================================================================
// TRACING EXPORTS
// =============================================================================

export {
  initializeTracing,
  shutdownTracing,
  getTracer,
  getActiveSpan,
  getTraceContext,
  startSpan,
  withSpan,
  withSpanSync,
  createHttpClientSpan,
  createDbSpan,
  createCacheSpan,
  createExternalCallSpan,
  createQueueSpan,
  createGraphQLSpan,
  extractContext,
  injectContext,
  addSpanAttributes,
  recordException,
  addSpanEvent,
  type TracingInitConfig,
  Span,
  Tracer,
  Context,
  SpanStatusCode,
} from './tracing/index.js';

// =============================================================================
// SLO EXPORTS
// =============================================================================

export {
  DEFAULT_SLO_TARGETS,
  BURN_RATE_WINDOWS,
  createAvailabilitySlo,
  createLatencySlo,
  createThroughputSlo,
  createWorkerSlos,
  calculateErrorBudget,
  timeToExhaustion,
  generateRecordingRules,
  generateAlertRules,
  generateSloConfig,
} from './slo/index.js';

// =============================================================================
// HEALTH CHECK EXPORTS
// =============================================================================

export {
  initializeHealth,
  registerHealthCheck,
  unregisterHealthCheck,
  runHealthChecks,
  livenessCheck,
  readinessCheck,
  createPostgresHealthCheck,
  createRedisHealthCheck,
  createNeo4jHealthCheck,
  createHttpHealthCheck,
  createMemoryHealthCheck,
  createDiskHealthCheck,
  createHealthRoutes,
  type HealthRouteHandlers,
} from './health/index.js';

// =============================================================================
// MIDDLEWARE EXPORTS
// =============================================================================

export {
  metricsMiddleware,
  tracingMiddleware,
  requestLoggingMiddleware,
  metricsHandler,
  errorMiddleware,
  createObservabilityMiddleware,
  setupObservability,
  type ObservabilityMiddlewareConfig,
  type ObservabilityMiddleware,
} from './middleware/index.js';

// =============================================================================
// INITIALIZATION HELPER
// =============================================================================

import { initializeMetrics, type MetricsConfig } from './metrics/index.js';
import { initializeTracing, type TracingInitConfig } from './tracing/index.js';
import { initializeHealth } from './health/index.js';
import type { ServiceConfig, ServiceArchetype } from './types/index.js';

export interface ObservabilityConfig {
  service: ServiceConfig;
  archetype?: ServiceArchetype;
  metrics?: Partial<MetricsConfig>;
  tracing?: Partial<TracingInitConfig>;
}

/**
 * Initialize all observability systems for a service
 *
 * This is the recommended way to set up observability. It initializes:
 * - Metrics collection with standard metrics for the service archetype
 * - Distributed tracing with OpenTelemetry
 * - Health check system
 *
 * @example
 * ```typescript
 * await initializeObservability({
 *   service: {
 *     name: 'user-api',
 *     version: '1.2.3',
 *     environment: 'production',
 *     team: 'platform',
 *     tier: 'critical',
 *   },
 *   archetype: 'api-service',
 * });
 * ```
 */
export async function initializeObservability(config: ObservabilityConfig): Promise<void> {
  const { service, metrics = {}, tracing = {} } = config;

  // Initialize metrics
  initializeMetrics({
    service,
    ...metrics,
  });

  // Initialize tracing
  await initializeTracing({
    service,
    ...tracing,
  });

  // Initialize health checks
  initializeHealth(service);
}

/**
 * Graceful shutdown of all observability systems
 */
export async function shutdownObservability(): Promise<void> {
  const { shutdownTracing } = await import('./tracing/index.js');
  await shutdownTracing();
}
