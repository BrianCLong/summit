"use strict";
// @ts-nocheck
/**
 * Standardized Prometheus Metrics Helpers
 *
 * Implements RED (Rate, Errors, Duration) and USE (Utilization, Saturation, Errors) methodologies
 * for comprehensive observability.
 *
 * RED Method (for request-driven services):
 *   - Rate: Requests per second
 *   - Errors: Failed requests per second
 *   - Duration: Latency distribution
 *
 * USE Method (for resource monitoring):
 *   - Utilization: % time resource is busy
 *   - Saturation: Queue depth or work pending
 *   - Errors: Error count
 *
 * Usage:
 *   import { redMetrics, useMetrics } from '@/observability/standard-metrics';
 *
 *   // RED metrics for HTTP requests
 *   const stopTimer = redMetrics.http.startTimer({ method: 'GET', route: '/api/users' });
 *   try {
 *     const result = await fetchUsers();
 *     redMetrics.http.recordSuccess({ method: 'GET', route: '/api/users' });
 *     return result;
 *   } catch (error: any) {
 *     redMetrics.http.recordError({ method: 'GET', route: '/api/users', error: error.name });
 *     throw error;
 *   } finally {
 *     stopTimer({ status: 'success' });
 *   }
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.USEMetrics = exports.REDMetrics = void 0;
exports.createStandardMetrics = createStandardMetrics;
const prom_client_1 = require("prom-client");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'observability:metrics' });
/**
 * RED Metrics for Request-Driven Services
 */
class REDMetrics {
    registry;
    config;
    // HTTP metrics
    httpRequestRate;
    httpErrorRate;
    httpRequestDuration;
    // GraphQL metrics
    graphqlRequestRate;
    graphqlErrorRate;
    graphqlRequestDuration;
    graphqlResolverDuration;
    // Database metrics
    dbQueryRate;
    dbQueryErrorRate;
    dbQueryDuration;
    constructor(registry, config = {}) {
        this.registry = registry;
        this.config = {
            enabled: config.enabled ?? true,
            prefix: config.prefix || 'intelgraph',
            defaultLabels: config.defaultLabels || {},
        };
        // HTTP RED metrics
        this.httpRequestRate = new prom_client_1.Counter({
            name: `${this.config.prefix}_http_requests_total`,
            help: 'Total number of HTTP requests (Rate)',
            labelNames: ['method', 'route', 'status_code'],
            registers: [this.registry],
        });
        this.httpErrorRate = new prom_client_1.Counter({
            name: `${this.config.prefix}_http_errors_total`,
            help: 'Total number of HTTP errors (Errors)',
            labelNames: ['method', 'route', 'error_type'],
            registers: [this.registry],
        });
        this.httpRequestDuration = new prom_client_1.Histogram({
            name: `${this.config.prefix}_http_request_duration_seconds`,
            help: 'HTTP request duration in seconds (Duration)',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 1.5, 2, 5, 10],
            registers: [this.registry],
        });
        // GraphQL RED metrics
        this.graphqlRequestRate = new prom_client_1.Counter({
            name: `${this.config.prefix}_graphql_requests_total`,
            help: 'Total number of GraphQL requests (Rate)',
            labelNames: ['operation_name', 'operation_type'],
            registers: [this.registry],
        });
        this.graphqlErrorRate = new prom_client_1.Counter({
            name: `${this.config.prefix}_graphql_errors_total`,
            help: 'Total number of GraphQL errors (Errors)',
            labelNames: ['operation_name', 'error_type'],
            registers: [this.registry],
        });
        this.graphqlRequestDuration = new prom_client_1.Histogram({
            name: `${this.config.prefix}_graphql_request_duration_seconds`,
            help: 'GraphQL request duration in seconds (Duration)',
            labelNames: ['operation_name', 'operation_type'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 1.5, 2, 5, 10],
            registers: [this.registry],
        });
        this.graphqlResolverDuration = new prom_client_1.Histogram({
            name: `${this.config.prefix}_graphql_resolver_duration_seconds`,
            help: 'GraphQL resolver duration in seconds',
            labelNames: ['type_name', 'field_name'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
            registers: [this.registry],
        });
        // Database RED metrics
        this.dbQueryRate = new prom_client_1.Counter({
            name: `${this.config.prefix}_db_queries_total`,
            help: 'Total number of database queries (Rate)',
            labelNames: ['db_type', 'operation'],
            registers: [this.registry],
        });
        this.dbQueryErrorRate = new prom_client_1.Counter({
            name: `${this.config.prefix}_db_query_errors_total`,
            help: 'Total number of database query errors (Errors)',
            labelNames: ['db_type', 'operation', 'error_type'],
            registers: [this.registry],
        });
        this.dbQueryDuration = new prom_client_1.Histogram({
            name: `${this.config.prefix}_db_query_duration_seconds`,
            help: 'Database query duration in seconds (Duration)',
            labelNames: ['db_type', 'operation'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
            registers: [this.registry],
        });
    }
    /**
     * HTTP request helpers
     */
    http = {
        startTimer: (labels) => {
            return this.httpRequestDuration.startTimer(labels);
        },
        recordSuccess: (labels) => {
            this.httpRequestRate.inc({
                method: labels.method,
                route: labels.route,
                status_code: String(labels.status_code || 200),
            });
        },
        recordError: (labels) => {
            this.httpErrorRate.inc(labels);
            this.httpRequestRate.inc({
                method: labels.method,
                route: labels.route,
                status_code: '500',
            });
        },
    };
    /**
     * GraphQL request helpers
     */
    graphql = {
        startTimer: (labels) => {
            return this.graphqlRequestDuration.startTimer(labels);
        },
        startResolverTimer: (labels) => {
            return this.graphqlResolverDuration.startTimer(labels);
        },
        recordSuccess: (labels) => {
            this.graphqlRequestRate.inc(labels);
        },
        recordError: (labels) => {
            this.graphqlErrorRate.inc(labels);
        },
    };
    /**
     * Database query helpers
     */
    database = {
        startTimer: (labels) => {
            return this.dbQueryDuration.startTimer(labels);
        },
        recordSuccess: (labels) => {
            this.dbQueryRate.inc(labels);
        },
        recordError: (labels) => {
            this.dbQueryErrorRate.inc(labels);
            this.dbQueryRate.inc({
                db_type: labels.db_type,
                operation: labels.operation,
            });
        },
    };
}
exports.REDMetrics = REDMetrics;
/**
 * USE Metrics for Resource Monitoring
 */
class USEMetrics {
    registry;
    config;
    // Utilization metrics
    cpuUtilization;
    memoryUtilization;
    dbConnectionUtilization;
    threadPoolUtilization;
    // Saturation metrics
    requestQueueDepth;
    dbConnectionQueueDepth;
    jobQueueDepth;
    backpressureEvents;
    // Error metrics
    systemErrors;
    resourceErrors;
    // Latency percentiles
    latencyP50;
    latencyP95;
    latencyP99;
    constructor(registry, config = {}) {
        this.registry = registry;
        this.config = {
            enabled: config.enabled ?? true,
            prefix: config.prefix || 'intelgraph',
            defaultLabels: config.defaultLabels || {},
        };
        // Utilization metrics (% busy)
        this.cpuUtilization = new prom_client_1.Gauge({
            name: `${this.config.prefix}_cpu_utilization_percent`,
            help: 'CPU utilization percentage (Utilization)',
            registers: [this.registry],
        });
        this.memoryUtilization = new prom_client_1.Gauge({
            name: `${this.config.prefix}_memory_utilization_percent`,
            help: 'Memory utilization percentage (Utilization)',
            registers: [this.registry],
        });
        this.dbConnectionUtilization = new prom_client_1.Gauge({
            name: `${this.config.prefix}_db_connection_utilization_percent`,
            help: 'Database connection pool utilization (Utilization)',
            labelNames: ['db_type', 'pool_name'],
            registers: [this.registry],
        });
        this.threadPoolUtilization = new prom_client_1.Gauge({
            name: `${this.config.prefix}_thread_pool_utilization_percent`,
            help: 'Thread pool utilization percentage (Utilization)',
            labelNames: ['pool_name'],
            registers: [this.registry],
        });
        // Saturation metrics (queue depth)
        this.requestQueueDepth = new prom_client_1.Gauge({
            name: `${this.config.prefix}_request_queue_depth`,
            help: 'Number of requests waiting to be processed (Saturation)',
            labelNames: ['queue_type'],
            registers: [this.registry],
        });
        this.dbConnectionQueueDepth = new prom_client_1.Gauge({
            name: `${this.config.prefix}_db_connection_queue_depth`,
            help: 'Number of requests waiting for DB connection (Saturation)',
            labelNames: ['db_type'],
            registers: [this.registry],
        });
        this.jobQueueDepth = new prom_client_1.Gauge({
            name: `${this.config.prefix}_job_queue_depth`,
            help: 'Number of jobs waiting in queue (Saturation)',
            labelNames: ['queue_name'],
            registers: [this.registry],
        });
        this.backpressureEvents = new prom_client_1.Counter({
            name: `${this.config.prefix}_backpressure_events_total`,
            help: 'Total backpressure events (Saturation)',
            labelNames: ['resource_type'],
            registers: [this.registry],
        });
        // Error metrics
        this.systemErrors = new prom_client_1.Counter({
            name: `${this.config.prefix}_system_errors_total`,
            help: 'Total system errors (Errors)',
            labelNames: ['error_type', 'subsystem'],
            registers: [this.registry],
        });
        this.resourceErrors = new prom_client_1.Counter({
            name: `${this.config.prefix}_resource_errors_total`,
            help: 'Total resource errors (Errors)',
            labelNames: ['resource_type', 'error_type'],
            registers: [this.registry],
        });
        // Latency percentiles (SLI metrics)
        this.latencyP50 = new prom_client_1.Summary({
            name: `${this.config.prefix}_latency_p50_seconds`,
            help: 'P50 latency in seconds',
            labelNames: ['operation_type'],
            percentiles: [0.5],
            registers: [this.registry],
        });
        this.latencyP95 = new prom_client_1.Summary({
            name: `${this.config.prefix}_latency_p95_seconds`,
            help: 'P95 latency in seconds (SLO target)',
            labelNames: ['operation_type'],
            percentiles: [0.95],
            registers: [this.registry],
        });
        this.latencyP99 = new prom_client_1.Summary({
            name: `${this.config.prefix}_latency_p99_seconds`,
            help: 'P99 latency in seconds',
            labelNames: ['operation_type'],
            percentiles: [0.99],
            registers: [this.registry],
        });
    }
    /**
     * Record utilization percentage
     */
    recordUtilization(metric, value, labels) {
        switch (metric) {
            case 'cpu':
                this.cpuUtilization.set(value);
                break;
            case 'memory':
                this.memoryUtilization.set(value);
                break;
            case 'db_connection':
                this.dbConnectionUtilization.set(labels || {}, value);
                break;
            case 'thread_pool':
                this.threadPoolUtilization.set(labels || {}, value);
                break;
        }
    }
    /**
     * Record saturation (queue depth)
     */
    recordSaturation(metric, value, labels) {
        switch (metric) {
            case 'request':
                this.requestQueueDepth.set(labels || {}, value);
                break;
            case 'db_connection':
                this.dbConnectionQueueDepth.set(labels || {}, value);
                break;
            case 'job':
                this.jobQueueDepth.set(labels || {}, value);
                break;
        }
    }
    /**
     * Record latency for percentile tracking
     */
    recordLatency(operationType, durationSeconds) {
        this.latencyP50.observe({ operation_type: operationType }, durationSeconds);
        this.latencyP95.observe({ operation_type: operationType }, durationSeconds);
        this.latencyP99.observe({ operation_type: operationType }, durationSeconds);
    }
    /**
     * Record backpressure event
     */
    recordBackpressure(resourceType) {
        this.backpressureEvents.inc({ resource_type: resourceType });
    }
    /**
     * Record system error
     */
    recordSystemError(errorType, subsystem) {
        this.systemErrors.inc({ error_type: errorType, subsystem });
    }
    /**
     * Record resource error
     */
    recordResourceError(resourceType, errorType) {
        this.resourceErrors.inc({ resource_type: resourceType, error_type: errorType });
    }
}
exports.USEMetrics = USEMetrics;
/**
 * Create standardized metrics instances
 */
function createStandardMetrics(registry, config) {
    const red = new REDMetrics(registry, config);
    const use = new USEMetrics(registry, config);
    logger.info({ prefix: config?.prefix || 'intelgraph' }, 'Standard metrics initialized');
    return { red, use };
}
