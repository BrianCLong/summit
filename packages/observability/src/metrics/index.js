"use strict";
/**
 * CompanyOS Observability SDK - Metrics Module
 *
 * Provides standardized metrics collection following the RED method
 * (Rate, Errors, Duration) and USE method (Utilization, Saturation, Errors).
 *
 * All services MUST emit these standard metrics to be observability-compliant.
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
exports.Summary = exports.Gauge = exports.Histogram = exports.Counter = exports.Registry = exports.client = exports.graphqlResolverDuration = exports.graphqlErrorsTotal = exports.graphqlOperationDuration = exports.graphqlOperationsTotal = exports.businessEventsTotal = exports.mlModelLoadTime = exports.mlInferenceDuration = exports.mlInferenceTotal = exports.externalRequestDuration = exports.externalRequestsTotal = exports.jobsInProgress = exports.jobsInQueue = exports.jobDuration = exports.jobsProcessedTotal = exports.cacheLatency = exports.cacheOperationsTotal = exports.dbConnectionsIdle = exports.dbConnectionsActive = exports.dbQueryDuration = exports.dbQueriesTotal = exports.errorsTotal = exports.httpRequestsInFlight = exports.httpRequestDuration = exports.httpRequestsTotal = exports.HISTOGRAM_BUCKETS = exports.registry = void 0;
exports.initializeMetrics = initializeMetrics;
exports.recordHttpRequest = recordHttpRequest;
exports.recordDbQuery = recordDbQuery;
exports.recordCacheOperation = recordCacheOperation;
exports.recordJob = recordJob;
exports.recordExternalCall = recordExternalCall;
exports.recordError = recordError;
exports.recordGraphQLOperation = recordGraphQLOperation;
exports.getMetrics = getMetrics;
exports.getMetricsContentType = getMetricsContentType;
exports.getRequiredMetrics = getRequiredMetrics;
const prom_client_1 = __importStar(require("prom-client"));
exports.client = prom_client_1.default;
Object.defineProperty(exports, "Registry", { enumerable: true, get: function () { return prom_client_1.Registry; } });
Object.defineProperty(exports, "Counter", { enumerable: true, get: function () { return prom_client_1.Counter; } });
Object.defineProperty(exports, "Histogram", { enumerable: true, get: function () { return prom_client_1.Histogram; } });
Object.defineProperty(exports, "Gauge", { enumerable: true, get: function () { return prom_client_1.Gauge; } });
Object.defineProperty(exports, "Summary", { enumerable: true, get: function () { return prom_client_1.Summary; } });
// =============================================================================
// METRIC REGISTRIES
// =============================================================================
/** Default registry for all service metrics */
exports.registry = new prom_client_1.Registry();
/** Standard histogram buckets for different operation types */
exports.HISTOGRAM_BUCKETS = {
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
};
// =============================================================================
// STANDARD METRICS (Required for ALL services)
// =============================================================================
/**
 * HTTP Request Metrics - Required for all API services
 */
exports.httpRequestsTotal = new prom_client_1.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests received',
    labelNames: ['service', 'method', 'route', 'status_code'],
    registers: [exports.registry],
});
exports.httpRequestDuration = new prom_client_1.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['service', 'method', 'route', 'status_code'],
    buckets: [...exports.HISTOGRAM_BUCKETS.http],
    registers: [exports.registry],
});
exports.httpRequestsInFlight = new prom_client_1.Gauge({
    name: 'http_requests_in_flight',
    help: 'Number of HTTP requests currently being processed',
    labelNames: ['service', 'method'],
    registers: [exports.registry],
});
/**
 * Error Metrics - Required for ALL services
 */
exports.errorsTotal = new prom_client_1.Counter({
    name: 'errors_total',
    help: 'Total number of errors by type',
    labelNames: ['service', 'error_type', 'severity'],
    registers: [exports.registry],
});
/**
 * Database Metrics - Required for services using databases
 */
exports.dbQueriesTotal = new prom_client_1.Counter({
    name: 'db_queries_total',
    help: 'Total number of database queries',
    labelNames: ['service', 'db_system', 'operation', 'status'],
    registers: [exports.registry],
});
exports.dbQueryDuration = new prom_client_1.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['service', 'db_system', 'operation'],
    buckets: [...exports.HISTOGRAM_BUCKETS.database],
    registers: [exports.registry],
});
exports.dbConnectionsActive = new prom_client_1.Gauge({
    name: 'db_connections_active',
    help: 'Number of active database connections',
    labelNames: ['service', 'db_system', 'pool'],
    registers: [exports.registry],
});
exports.dbConnectionsIdle = new prom_client_1.Gauge({
    name: 'db_connections_idle',
    help: 'Number of idle database connections',
    labelNames: ['service', 'db_system', 'pool'],
    registers: [exports.registry],
});
/**
 * Cache Metrics - Required for services using caching
 */
exports.cacheOperationsTotal = new prom_client_1.Counter({
    name: 'cache_operations_total',
    help: 'Total cache operations by result',
    labelNames: ['service', 'cache_name', 'operation', 'result'],
    registers: [exports.registry],
});
exports.cacheLatency = new prom_client_1.Histogram({
    name: 'cache_operation_duration_seconds',
    help: 'Cache operation duration in seconds',
    labelNames: ['service', 'cache_name', 'operation'],
    buckets: [...exports.HISTOGRAM_BUCKETS.cache],
    registers: [exports.registry],
});
/**
 * Queue/Job Metrics - Required for worker services
 */
exports.jobsProcessedTotal = new prom_client_1.Counter({
    name: 'jobs_processed_total',
    help: 'Total number of jobs processed',
    labelNames: ['service', 'queue', 'job_type', 'status'],
    registers: [exports.registry],
});
exports.jobDuration = new prom_client_1.Histogram({
    name: 'job_duration_seconds',
    help: 'Job processing duration in seconds',
    labelNames: ['service', 'queue', 'job_type'],
    buckets: [...exports.HISTOGRAM_BUCKETS.job],
    registers: [exports.registry],
});
exports.jobsInQueue = new prom_client_1.Gauge({
    name: 'jobs_in_queue',
    help: 'Number of jobs waiting in queue',
    labelNames: ['service', 'queue', 'priority'],
    registers: [exports.registry],
});
exports.jobsInProgress = new prom_client_1.Gauge({
    name: 'jobs_in_progress',
    help: 'Number of jobs currently being processed',
    labelNames: ['service', 'queue'],
    registers: [exports.registry],
});
/**
 * External Service Metrics - Required for services calling external APIs
 */
exports.externalRequestsTotal = new prom_client_1.Counter({
    name: 'external_requests_total',
    help: 'Total number of external service requests',
    labelNames: ['service', 'target_service', 'method', 'status'],
    registers: [exports.registry],
});
exports.externalRequestDuration = new prom_client_1.Histogram({
    name: 'external_request_duration_seconds',
    help: 'External service request duration in seconds',
    labelNames: ['service', 'target_service', 'method'],
    buckets: [...exports.HISTOGRAM_BUCKETS.external],
    registers: [exports.registry],
});
/**
 * ML/AI Metrics - Required for ML services
 */
exports.mlInferenceTotal = new prom_client_1.Counter({
    name: 'ml_inference_total',
    help: 'Total number of ML inference requests',
    labelNames: ['service', 'model', 'version', 'status'],
    registers: [exports.registry],
});
exports.mlInferenceDuration = new prom_client_1.Histogram({
    name: 'ml_inference_duration_seconds',
    help: 'ML inference duration in seconds',
    labelNames: ['service', 'model', 'version'],
    buckets: [...exports.HISTOGRAM_BUCKETS.ml],
    registers: [exports.registry],
});
exports.mlModelLoadTime = new prom_client_1.Gauge({
    name: 'ml_model_load_time_seconds',
    help: 'Time taken to load ML model',
    labelNames: ['service', 'model', 'version'],
    registers: [exports.registry],
});
/**
 * Business Metrics - Custom per service
 */
exports.businessEventsTotal = new prom_client_1.Counter({
    name: 'business_events_total',
    help: 'Total business events by type',
    labelNames: ['service', 'event_type', 'status'],
    registers: [exports.registry],
});
/**
 * GraphQL Metrics - For GraphQL services
 */
exports.graphqlOperationsTotal = new prom_client_1.Counter({
    name: 'graphql_operations_total',
    help: 'Total GraphQL operations',
    labelNames: ['service', 'operation_name', 'operation_type'],
    registers: [exports.registry],
});
exports.graphqlOperationDuration = new prom_client_1.Histogram({
    name: 'graphql_operation_duration_seconds',
    help: 'GraphQL operation duration in seconds',
    labelNames: ['service', 'operation_name', 'operation_type'],
    buckets: [...exports.HISTOGRAM_BUCKETS.http],
    registers: [exports.registry],
});
exports.graphqlErrorsTotal = new prom_client_1.Counter({
    name: 'graphql_errors_total',
    help: 'Total GraphQL errors',
    labelNames: ['service', 'operation_name', 'error_code'],
    registers: [exports.registry],
});
exports.graphqlResolverDuration = new prom_client_1.Histogram({
    name: 'graphql_resolver_duration_seconds',
    help: 'GraphQL resolver duration in seconds',
    labelNames: ['service', 'resolver', 'parent_type'],
    buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [exports.registry],
});
/**
 * Initialize metrics collection for a service
 */
function initializeMetrics(config) {
    const { service, collectDefaultMetrics: collectDefault = true, defaultLabels } = config;
    // Set default labels for all metrics
    exports.registry.setDefaultLabels({
        service: service.name,
        environment: service.environment,
        version: service.version,
        ...defaultLabels,
    });
    // Collect Node.js default metrics
    if (collectDefault) {
        (0, prom_client_1.collectDefaultMetrics)({
            register: exports.registry,
            prefix: 'nodejs_',
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
            eventLoopMonitoringPrecision: 10,
        });
    }
    return exports.registry;
}
/**
 * Record an HTTP request with all standard metrics
 */
function recordHttpRequest(method, route, statusCode, durationSeconds, service) {
    const labels = { service, method, route, status_code: String(statusCode) };
    exports.httpRequestsTotal.labels(labels).inc();
    exports.httpRequestDuration.labels(labels).observe(durationSeconds);
}
/**
 * Record a database query with all standard metrics
 */
function recordDbQuery(dbSystem, operation, durationSeconds, success, service) {
    const status = success ? 'success' : 'error';
    exports.dbQueriesTotal.labels({ service, db_system: dbSystem, operation, status }).inc();
    exports.dbQueryDuration.labels({ service, db_system: dbSystem, operation }).observe(durationSeconds);
}
/**
 * Record a cache operation
 */
function recordCacheOperation(cacheName, operation, hit, durationSeconds, service) {
    const result = operation === 'get' ? (hit ? 'hit' : 'miss') : 'success';
    exports.cacheOperationsTotal.labels({ service, cache_name: cacheName, operation, result }).inc();
    exports.cacheLatency.labels({ service, cache_name: cacheName, operation }).observe(durationSeconds);
}
/**
 * Record a background job
 */
function recordJob(queue, jobType, status, durationSeconds, service) {
    exports.jobsProcessedTotal.labels({ service, queue, job_type: jobType, status }).inc();
    exports.jobDuration.labels({ service, queue, job_type: jobType }).observe(durationSeconds);
}
/**
 * Record an external service call
 */
function recordExternalCall(targetService, method, statusCode, durationSeconds, service) {
    const status = statusCode >= 200 && statusCode < 400 ? 'success' : 'error';
    exports.externalRequestsTotal.labels({ service, target_service: targetService, method, status }).inc();
    exports.externalRequestDuration
        .labels({ service, target_service: targetService, method })
        .observe(durationSeconds);
}
/**
 * Record an error
 */
function recordError(errorType, severity, service) {
    exports.errorsTotal.labels({ service, error_type: errorType, severity }).inc();
}
/**
 * Record a GraphQL operation
 */
function recordGraphQLOperation(operationName, operationType, durationSeconds, errorCode, service) {
    const svc = service || 'unknown';
    exports.graphqlOperationsTotal.labels({ service: svc, operation_name: operationName, operation_type: operationType }).inc();
    exports.graphqlOperationDuration
        .labels({ service: svc, operation_name: operationName, operation_type: operationType })
        .observe(durationSeconds);
    if (errorCode) {
        exports.graphqlErrorsTotal.labels({ service: svc, operation_name: operationName, error_code: errorCode }).inc();
    }
}
/**
 * Get metrics in Prometheus format
 */
async function getMetrics() {
    return exports.registry.metrics();
}
/**
 * Get content type for metrics endpoint
 */
function getMetricsContentType() {
    return exports.registry.contentType;
}
// =============================================================================
// ARCHETYPE-SPECIFIC METRIC SETS
// =============================================================================
/**
 * Get required metrics for a service archetype
 */
function getRequiredMetrics(archetype) {
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
