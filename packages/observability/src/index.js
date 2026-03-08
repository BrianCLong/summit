"use strict";
/**
 * @intelgraph/observability
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
 * } from '@intelgraph/observability';
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapLogLevel = exports.AuditLogger = exports.createAuditLogger = exports.createOperationLogger = exports.createRequestLogger = exports.withTraceContext = exports.createLogger = exports.Summary = exports.Gauge = exports.Histogram = exports.Counter = exports.Registry = exports.client = exports.getRequiredMetrics = exports.getMetricsContentType = exports.getMetrics = exports.recordGraphQLOperation = exports.recordError = exports.recordExternalCall = exports.recordJob = exports.recordCacheOperation = exports.recordDbQuery = exports.recordHttpRequest = exports.initializeMetrics = exports.HISTOGRAM_BUCKETS = exports.graphqlResolverDuration = exports.graphqlErrorsTotal = exports.graphqlOperationDuration = exports.graphqlOperationsTotal = exports.businessEventsTotal = exports.mlModelLoadTime = exports.mlInferenceDuration = exports.mlInferenceTotal = exports.externalRequestDuration = exports.externalRequestsTotal = exports.jobsInProgress = exports.jobsInQueue = exports.jobDuration = exports.jobsProcessedTotal = exports.cacheLatency = exports.cacheOperationsTotal = exports.dbConnectionsIdle = exports.dbConnectionsActive = exports.dbQueryDuration = exports.dbQueriesTotal = exports.errorsTotal = exports.httpRequestsInFlight = exports.httpRequestDuration = exports.httpRequestsTotal = exports.registry = void 0;
exports.metricsMiddleware = exports.createHealthRoutes = exports.createDiskHealthCheck = exports.createMemoryHealthCheck = exports.createHttpHealthCheck = exports.createNeo4jHealthCheck = exports.createRedisHealthCheck = exports.createPostgresHealthCheck = exports.readinessCheck = exports.livenessCheck = exports.runHealthChecks = exports.unregisterHealthCheck = exports.registerHealthCheck = exports.initializeHealth = exports.generateSloConfig = exports.generateAlertRules = exports.generateRecordingRules = exports.timeToExhaustion = exports.calculateErrorBudget = exports.createWorkerSlos = exports.createThroughputSlo = exports.createLatencySlo = exports.createAvailabilitySlo = exports.BURN_RATE_WINDOWS = exports.DEFAULT_SLO_TARGETS = exports.SpanStatusCode = exports.Context = exports.Tracer = exports.addSpanEvent = exports.recordException = exports.addSpanAttributes = exports.injectContext = exports.extractContext = exports.createGraphQLSpan = exports.createQueueSpan = exports.createExternalCallSpan = exports.createCacheSpan = exports.createDbSpan = exports.createHttpClientSpan = exports.withSpanSync = exports.withSpan = exports.startSpan = exports.getTraceContext = exports.getActiveSpan = exports.getTracer = exports.shutdownTracing = exports.initializeTracing = exports.logWarning = exports.logError = exports.isLevelEnabled = void 0;
exports.setupObservability = exports.createObservabilityMiddleware = exports.errorMiddleware = exports.metricsHandler = exports.requestLoggingMiddleware = exports.tracingMiddleware = void 0;
exports.initializeObservability = initializeObservability;
exports.shutdownObservability = shutdownObservability;
// =============================================================================
// METRICS EXPORTS
// =============================================================================
var index_js_1 = require("./metrics/index.js");
// Registry
Object.defineProperty(exports, "registry", { enumerable: true, get: function () { return index_js_1.registry; } });
// Standard metrics
Object.defineProperty(exports, "httpRequestsTotal", { enumerable: true, get: function () { return index_js_1.httpRequestsTotal; } });
Object.defineProperty(exports, "httpRequestDuration", { enumerable: true, get: function () { return index_js_1.httpRequestDuration; } });
Object.defineProperty(exports, "httpRequestsInFlight", { enumerable: true, get: function () { return index_js_1.httpRequestsInFlight; } });
Object.defineProperty(exports, "errorsTotal", { enumerable: true, get: function () { return index_js_1.errorsTotal; } });
Object.defineProperty(exports, "dbQueriesTotal", { enumerable: true, get: function () { return index_js_1.dbQueriesTotal; } });
Object.defineProperty(exports, "dbQueryDuration", { enumerable: true, get: function () { return index_js_1.dbQueryDuration; } });
Object.defineProperty(exports, "dbConnectionsActive", { enumerable: true, get: function () { return index_js_1.dbConnectionsActive; } });
Object.defineProperty(exports, "dbConnectionsIdle", { enumerable: true, get: function () { return index_js_1.dbConnectionsIdle; } });
Object.defineProperty(exports, "cacheOperationsTotal", { enumerable: true, get: function () { return index_js_1.cacheOperationsTotal; } });
Object.defineProperty(exports, "cacheLatency", { enumerable: true, get: function () { return index_js_1.cacheLatency; } });
Object.defineProperty(exports, "jobsProcessedTotal", { enumerable: true, get: function () { return index_js_1.jobsProcessedTotal; } });
Object.defineProperty(exports, "jobDuration", { enumerable: true, get: function () { return index_js_1.jobDuration; } });
Object.defineProperty(exports, "jobsInQueue", { enumerable: true, get: function () { return index_js_1.jobsInQueue; } });
Object.defineProperty(exports, "jobsInProgress", { enumerable: true, get: function () { return index_js_1.jobsInProgress; } });
Object.defineProperty(exports, "externalRequestsTotal", { enumerable: true, get: function () { return index_js_1.externalRequestsTotal; } });
Object.defineProperty(exports, "externalRequestDuration", { enumerable: true, get: function () { return index_js_1.externalRequestDuration; } });
Object.defineProperty(exports, "mlInferenceTotal", { enumerable: true, get: function () { return index_js_1.mlInferenceTotal; } });
Object.defineProperty(exports, "mlInferenceDuration", { enumerable: true, get: function () { return index_js_1.mlInferenceDuration; } });
Object.defineProperty(exports, "mlModelLoadTime", { enumerable: true, get: function () { return index_js_1.mlModelLoadTime; } });
Object.defineProperty(exports, "businessEventsTotal", { enumerable: true, get: function () { return index_js_1.businessEventsTotal; } });
Object.defineProperty(exports, "graphqlOperationsTotal", { enumerable: true, get: function () { return index_js_1.graphqlOperationsTotal; } });
Object.defineProperty(exports, "graphqlOperationDuration", { enumerable: true, get: function () { return index_js_1.graphqlOperationDuration; } });
Object.defineProperty(exports, "graphqlErrorsTotal", { enumerable: true, get: function () { return index_js_1.graphqlErrorsTotal; } });
Object.defineProperty(exports, "graphqlResolverDuration", { enumerable: true, get: function () { return index_js_1.graphqlResolverDuration; } });
// Histogram buckets
Object.defineProperty(exports, "HISTOGRAM_BUCKETS", { enumerable: true, get: function () { return index_js_1.HISTOGRAM_BUCKETS; } });
// Helper functions
Object.defineProperty(exports, "initializeMetrics", { enumerable: true, get: function () { return index_js_1.initializeMetrics; } });
Object.defineProperty(exports, "recordHttpRequest", { enumerable: true, get: function () { return index_js_1.recordHttpRequest; } });
Object.defineProperty(exports, "recordDbQuery", { enumerable: true, get: function () { return index_js_1.recordDbQuery; } });
Object.defineProperty(exports, "recordCacheOperation", { enumerable: true, get: function () { return index_js_1.recordCacheOperation; } });
Object.defineProperty(exports, "recordJob", { enumerable: true, get: function () { return index_js_1.recordJob; } });
Object.defineProperty(exports, "recordExternalCall", { enumerable: true, get: function () { return index_js_1.recordExternalCall; } });
Object.defineProperty(exports, "recordError", { enumerable: true, get: function () { return index_js_1.recordError; } });
Object.defineProperty(exports, "recordGraphQLOperation", { enumerable: true, get: function () { return index_js_1.recordGraphQLOperation; } });
Object.defineProperty(exports, "getMetrics", { enumerable: true, get: function () { return index_js_1.getMetrics; } });
Object.defineProperty(exports, "getMetricsContentType", { enumerable: true, get: function () { return index_js_1.getMetricsContentType; } });
Object.defineProperty(exports, "getRequiredMetrics", { enumerable: true, get: function () { return index_js_1.getRequiredMetrics; } });
// prom-client re-exports
Object.defineProperty(exports, "client", { enumerable: true, get: function () { return index_js_1.client; } });
Object.defineProperty(exports, "Registry", { enumerable: true, get: function () { return index_js_1.Registry; } });
Object.defineProperty(exports, "Counter", { enumerable: true, get: function () { return index_js_1.Counter; } });
Object.defineProperty(exports, "Histogram", { enumerable: true, get: function () { return index_js_1.Histogram; } });
Object.defineProperty(exports, "Gauge", { enumerable: true, get: function () { return index_js_1.Gauge; } });
Object.defineProperty(exports, "Summary", { enumerable: true, get: function () { return index_js_1.Summary; } });
// =============================================================================
// LOGGING EXPORTS
// =============================================================================
var index_js_2 = require("./logging/index.js");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return index_js_2.createLogger; } });
Object.defineProperty(exports, "withTraceContext", { enumerable: true, get: function () { return index_js_2.withTraceContext; } });
Object.defineProperty(exports, "createRequestLogger", { enumerable: true, get: function () { return index_js_2.createRequestLogger; } });
Object.defineProperty(exports, "createOperationLogger", { enumerable: true, get: function () { return index_js_2.createOperationLogger; } });
Object.defineProperty(exports, "createAuditLogger", { enumerable: true, get: function () { return index_js_2.createAuditLogger; } });
Object.defineProperty(exports, "AuditLogger", { enumerable: true, get: function () { return index_js_2.AuditLogger; } });
Object.defineProperty(exports, "mapLogLevel", { enumerable: true, get: function () { return index_js_2.mapLogLevel; } });
Object.defineProperty(exports, "isLevelEnabled", { enumerable: true, get: function () { return index_js_2.isLevelEnabled; } });
Object.defineProperty(exports, "logError", { enumerable: true, get: function () { return index_js_2.logError; } });
Object.defineProperty(exports, "logWarning", { enumerable: true, get: function () { return index_js_2.logWarning; } });
// =============================================================================
// TRACING EXPORTS
// =============================================================================
var index_js_3 = require("./tracing/index.js");
Object.defineProperty(exports, "initializeTracing", { enumerable: true, get: function () { return index_js_3.initializeTracing; } });
Object.defineProperty(exports, "shutdownTracing", { enumerable: true, get: function () { return index_js_3.shutdownTracing; } });
Object.defineProperty(exports, "getTracer", { enumerable: true, get: function () { return index_js_3.getTracer; } });
Object.defineProperty(exports, "getActiveSpan", { enumerable: true, get: function () { return index_js_3.getActiveSpan; } });
Object.defineProperty(exports, "getTraceContext", { enumerable: true, get: function () { return index_js_3.getTraceContext; } });
Object.defineProperty(exports, "startSpan", { enumerable: true, get: function () { return index_js_3.startSpan; } });
Object.defineProperty(exports, "withSpan", { enumerable: true, get: function () { return index_js_3.withSpan; } });
Object.defineProperty(exports, "withSpanSync", { enumerable: true, get: function () { return index_js_3.withSpanSync; } });
Object.defineProperty(exports, "createHttpClientSpan", { enumerable: true, get: function () { return index_js_3.createHttpClientSpan; } });
Object.defineProperty(exports, "createDbSpan", { enumerable: true, get: function () { return index_js_3.createDbSpan; } });
Object.defineProperty(exports, "createCacheSpan", { enumerable: true, get: function () { return index_js_3.createCacheSpan; } });
Object.defineProperty(exports, "createExternalCallSpan", { enumerable: true, get: function () { return index_js_3.createExternalCallSpan; } });
Object.defineProperty(exports, "createQueueSpan", { enumerable: true, get: function () { return index_js_3.createQueueSpan; } });
Object.defineProperty(exports, "createGraphQLSpan", { enumerable: true, get: function () { return index_js_3.createGraphQLSpan; } });
Object.defineProperty(exports, "extractContext", { enumerable: true, get: function () { return index_js_3.extractContext; } });
Object.defineProperty(exports, "injectContext", { enumerable: true, get: function () { return index_js_3.injectContext; } });
Object.defineProperty(exports, "addSpanAttributes", { enumerable: true, get: function () { return index_js_3.addSpanAttributes; } });
Object.defineProperty(exports, "recordException", { enumerable: true, get: function () { return index_js_3.recordException; } });
Object.defineProperty(exports, "addSpanEvent", { enumerable: true, get: function () { return index_js_3.addSpanEvent; } });
Object.defineProperty(exports, "Tracer", { enumerable: true, get: function () { return index_js_3.Tracer; } });
Object.defineProperty(exports, "Context", { enumerable: true, get: function () { return index_js_3.Context; } });
Object.defineProperty(exports, "SpanStatusCode", { enumerable: true, get: function () { return index_js_3.SpanStatusCode; } });
// =============================================================================
// SLO EXPORTS
// =============================================================================
var index_js_4 = require("./slo/index.js");
Object.defineProperty(exports, "DEFAULT_SLO_TARGETS", { enumerable: true, get: function () { return index_js_4.DEFAULT_SLO_TARGETS; } });
Object.defineProperty(exports, "BURN_RATE_WINDOWS", { enumerable: true, get: function () { return index_js_4.BURN_RATE_WINDOWS; } });
Object.defineProperty(exports, "createAvailabilitySlo", { enumerable: true, get: function () { return index_js_4.createAvailabilitySlo; } });
Object.defineProperty(exports, "createLatencySlo", { enumerable: true, get: function () { return index_js_4.createLatencySlo; } });
Object.defineProperty(exports, "createThroughputSlo", { enumerable: true, get: function () { return index_js_4.createThroughputSlo; } });
Object.defineProperty(exports, "createWorkerSlos", { enumerable: true, get: function () { return index_js_4.createWorkerSlos; } });
Object.defineProperty(exports, "calculateErrorBudget", { enumerable: true, get: function () { return index_js_4.calculateErrorBudget; } });
Object.defineProperty(exports, "timeToExhaustion", { enumerable: true, get: function () { return index_js_4.timeToExhaustion; } });
Object.defineProperty(exports, "generateRecordingRules", { enumerable: true, get: function () { return index_js_4.generateRecordingRules; } });
Object.defineProperty(exports, "generateAlertRules", { enumerable: true, get: function () { return index_js_4.generateAlertRules; } });
Object.defineProperty(exports, "generateSloConfig", { enumerable: true, get: function () { return index_js_4.generateSloConfig; } });
// =============================================================================
// HEALTH CHECK EXPORTS
// =============================================================================
var index_js_5 = require("./health/index.js");
Object.defineProperty(exports, "initializeHealth", { enumerable: true, get: function () { return index_js_5.initializeHealth; } });
Object.defineProperty(exports, "registerHealthCheck", { enumerable: true, get: function () { return index_js_5.registerHealthCheck; } });
Object.defineProperty(exports, "unregisterHealthCheck", { enumerable: true, get: function () { return index_js_5.unregisterHealthCheck; } });
Object.defineProperty(exports, "runHealthChecks", { enumerable: true, get: function () { return index_js_5.runHealthChecks; } });
Object.defineProperty(exports, "livenessCheck", { enumerable: true, get: function () { return index_js_5.livenessCheck; } });
Object.defineProperty(exports, "readinessCheck", { enumerable: true, get: function () { return index_js_5.readinessCheck; } });
Object.defineProperty(exports, "createPostgresHealthCheck", { enumerable: true, get: function () { return index_js_5.createPostgresHealthCheck; } });
Object.defineProperty(exports, "createRedisHealthCheck", { enumerable: true, get: function () { return index_js_5.createRedisHealthCheck; } });
Object.defineProperty(exports, "createNeo4jHealthCheck", { enumerable: true, get: function () { return index_js_5.createNeo4jHealthCheck; } });
Object.defineProperty(exports, "createHttpHealthCheck", { enumerable: true, get: function () { return index_js_5.createHttpHealthCheck; } });
Object.defineProperty(exports, "createMemoryHealthCheck", { enumerable: true, get: function () { return index_js_5.createMemoryHealthCheck; } });
Object.defineProperty(exports, "createDiskHealthCheck", { enumerable: true, get: function () { return index_js_5.createDiskHealthCheck; } });
Object.defineProperty(exports, "createHealthRoutes", { enumerable: true, get: function () { return index_js_5.createHealthRoutes; } });
// =============================================================================
// MIDDLEWARE EXPORTS
// =============================================================================
var index_js_6 = require("./middleware/index.js");
Object.defineProperty(exports, "metricsMiddleware", { enumerable: true, get: function () { return index_js_6.metricsMiddleware; } });
Object.defineProperty(exports, "tracingMiddleware", { enumerable: true, get: function () { return index_js_6.tracingMiddleware; } });
Object.defineProperty(exports, "requestLoggingMiddleware", { enumerable: true, get: function () { return index_js_6.requestLoggingMiddleware; } });
Object.defineProperty(exports, "metricsHandler", { enumerable: true, get: function () { return index_js_6.metricsHandler; } });
Object.defineProperty(exports, "errorMiddleware", { enumerable: true, get: function () { return index_js_6.errorMiddleware; } });
Object.defineProperty(exports, "createObservabilityMiddleware", { enumerable: true, get: function () { return index_js_6.createObservabilityMiddleware; } });
Object.defineProperty(exports, "setupObservability", { enumerable: true, get: function () { return index_js_6.setupObservability; } });
// =============================================================================
// INITIALIZATION HELPER
// =============================================================================
const index_js_7 = require("./metrics/index.js");
const index_js_8 = require("./tracing/index.js");
const index_js_9 = require("./health/index.js");
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
async function initializeObservability(config) {
    const { service, metrics = {}, tracing = {} } = config;
    // Initialize metrics
    (0, index_js_7.initializeMetrics)({
        service,
        ...metrics,
    });
    // Initialize tracing
    await (0, index_js_8.initializeTracing)({
        service,
        ...tracing,
    });
    // Initialize health checks
    (0, index_js_9.initializeHealth)(service);
}
/**
 * Graceful shutdown of all observability systems
 */
async function shutdownObservability() {
    const { shutdownTracing } = await Promise.resolve().then(() => __importStar(require('./tracing/index.js')));
    await shutdownTracing();
}
