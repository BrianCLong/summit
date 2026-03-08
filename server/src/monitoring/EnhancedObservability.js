"use strict";
// @ts-nocheck
/**
 * @fileoverview Enhanced Observability Configuration
 *
 * Production-grade observability setup with:
 * - Structured logging with correlation IDs
 * - Custom metrics collection
 * - Health check endpoints
 * - SLO/SLI tracking
 * - Alert threshold configuration
 *
 * @module monitoring/EnhancedObservability
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.observability = exports.HealthCheckManager = exports.MetricsCollector = exports.StructuredLogger = void 0;
exports.correlationIdMiddleware = correlationIdMiddleware;
exports.createObservabilitySetup = createObservabilitySetup;
const prom_client_1 = require("prom-client");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Default observability configuration
 */
const defaultConfig = {
    serviceName: process.env.OTEL_SERVICE_NAME || 'intelgraph-api',
    serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    metrics: {
        enabled: true,
        prefix: 'intelgraph_',
        defaultLabels: {},
        collectDefaultMetrics: true,
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json',
        correlationIdHeader: 'x-correlation-id',
    },
    healthCheck: {
        path: '/health',
        interval: 30000,
        timeout: 5000,
    },
    slo: {
        availability: 99.9,
        latencyP99: 500,
        errorRate: 0.1,
    },
};
/**
 * Structured Logger class
 */
class StructuredLogger {
    serviceName;
    environment;
    level;
    constructor(config) {
        this.serviceName = config.serviceName;
        this.environment = config.environment;
        this.level = config.logging.level;
    }
    formatMessage(level, message, context) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            service: this.serviceName,
            environment: this.environment,
            message,
            ...context,
        };
        return JSON.stringify(logEntry);
    }
    debug(message, context) {
        if (['debug'].includes(this.level)) {
            console.debug(this.formatMessage('debug', message, context));
        }
    }
    info(message, context) {
        if (['debug', 'info'].includes(this.level)) {
            console.info(this.formatMessage('info', message, context));
        }
    }
    warn(message, context) {
        if (['debug', 'info', 'warn'].includes(this.level)) {
            console.warn(this.formatMessage('warn', message, context));
        }
    }
    error(message, context) {
        console.error(this.formatMessage('error', message, context));
    }
    child(defaultContext) {
        return new ChildLogger(this, defaultContext);
    }
}
exports.StructuredLogger = StructuredLogger;
/**
 * Child Logger with default context
 */
class ChildLogger {
    parent;
    defaultContext;
    constructor(parent, defaultContext) {
        this.parent = parent;
        this.defaultContext = defaultContext;
    }
    debug(message, context) {
        this.parent.debug(message, { ...this.defaultContext, ...context });
    }
    info(message, context) {
        this.parent.info(message, { ...this.defaultContext, ...context });
    }
    warn(message, context) {
        this.parent.warn(message, { ...this.defaultContext, ...context });
    }
    error(message, context) {
        this.parent.error(message, { ...this.defaultContext, ...context });
    }
}
/**
 * Enhanced Metrics Collector
 */
class MetricsCollector {
    registry;
    config;
    // HTTP Metrics
    httpRequestsTotal;
    httpRequestDuration;
    httpRequestSize;
    httpResponseSize;
    activeConnections;
    // GraphQL Metrics
    graphqlOperationsTotal;
    graphqlOperationDuration;
    graphqlErrors;
    graphqlDepth;
    // Database Metrics
    dbConnectionsActive;
    dbConnectionsIdle;
    dbQueryDuration;
    dbQueryErrors;
    // Cache Metrics
    cacheHits;
    cacheMisses;
    cacheSize;
    // Business Metrics
    entitiesCreated;
    relationshipsCreated;
    investigationsActive;
    aiRequestsTotal;
    aiRequestDuration;
    // SLO Metrics
    sloAvailability;
    sloLatencyBudget;
    sloErrorBudget;
    constructor(config = defaultConfig) {
        this.config = config;
        this.registry = new prom_client_1.Registry();
        if (config.metrics.defaultLabels) {
            this.registry.setDefaultLabels(config.metrics.defaultLabels);
        }
        if (config.metrics.collectDefaultMetrics) {
            (0, prom_client_1.collectDefaultMetrics)({
                register: this.registry,
                prefix: config.metrics.prefix,
            });
        }
        // Initialize all metrics
        this.httpRequestsTotal = new prom_client_1.Counter({
            name: `${config.metrics.prefix}http_requests_total`,
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'path', 'status', 'tenant'],
            registers: [this.registry],
        });
        this.httpRequestDuration = new prom_client_1.Histogram({
            name: `${config.metrics.prefix}http_request_duration_seconds`,
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'path', 'status'],
            buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
            registers: [this.registry],
        });
        this.httpRequestSize = new prom_client_1.Histogram({
            name: `${config.metrics.prefix}http_request_size_bytes`,
            help: 'HTTP request size in bytes',
            labelNames: ['method', 'path'],
            buckets: [100, 1000, 10000, 100000, 1000000],
            registers: [this.registry],
        });
        this.httpResponseSize = new prom_client_1.Histogram({
            name: `${config.metrics.prefix}http_response_size_bytes`,
            help: 'HTTP response size in bytes',
            labelNames: ['method', 'path', 'status'],
            buckets: [100, 1000, 10000, 100000, 1000000],
            registers: [this.registry],
        });
        this.activeConnections = new prom_client_1.Gauge({
            name: `${config.metrics.prefix}http_active_connections`,
            help: 'Number of active HTTP connections',
            registers: [this.registry],
        });
        // GraphQL Metrics
        this.graphqlOperationsTotal = new prom_client_1.Counter({
            name: `${config.metrics.prefix}graphql_operations_total`,
            help: 'Total GraphQL operations',
            labelNames: ['operation', 'type', 'status'],
            registers: [this.registry],
        });
        this.graphqlOperationDuration = new prom_client_1.Histogram({
            name: `${config.metrics.prefix}graphql_operation_duration_seconds`,
            help: 'GraphQL operation duration in seconds',
            labelNames: ['operation', 'type'],
            buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
            registers: [this.registry],
        });
        this.graphqlErrors = new prom_client_1.Counter({
            name: `${config.metrics.prefix}graphql_errors_total`,
            help: 'Total GraphQL errors',
            labelNames: ['operation', 'error_type'],
            registers: [this.registry],
        });
        this.graphqlDepth = new prom_client_1.Histogram({
            name: `${config.metrics.prefix}graphql_query_depth`,
            help: 'GraphQL query depth',
            labelNames: ['operation'],
            buckets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            registers: [this.registry],
        });
        // Database Metrics
        this.dbConnectionsActive = new prom_client_1.Gauge({
            name: `${config.metrics.prefix}db_connections_active`,
            help: 'Active database connections',
            labelNames: ['database'],
            registers: [this.registry],
        });
        this.dbConnectionsIdle = new prom_client_1.Gauge({
            name: `${config.metrics.prefix}db_connections_idle`,
            help: 'Idle database connections',
            labelNames: ['database'],
            registers: [this.registry],
        });
        this.dbQueryDuration = new prom_client_1.Histogram({
            name: `${config.metrics.prefix}db_query_duration_seconds`,
            help: 'Database query duration in seconds',
            labelNames: ['database', 'operation'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
            registers: [this.registry],
        });
        this.dbQueryErrors = new prom_client_1.Counter({
            name: `${config.metrics.prefix}db_query_errors_total`,
            help: 'Total database query errors',
            labelNames: ['database', 'operation', 'error_type'],
            registers: [this.registry],
        });
        // Cache Metrics
        this.cacheHits = new prom_client_1.Counter({
            name: `${config.metrics.prefix}cache_hits_total`,
            help: 'Total cache hits',
            labelNames: ['cache_type', 'key_pattern'],
            registers: [this.registry],
        });
        this.cacheMisses = new prom_client_1.Counter({
            name: `${config.metrics.prefix}cache_misses_total`,
            help: 'Total cache misses',
            labelNames: ['cache_type', 'key_pattern'],
            registers: [this.registry],
        });
        this.cacheSize = new prom_client_1.Gauge({
            name: `${config.metrics.prefix}cache_size_bytes`,
            help: 'Current cache size in bytes',
            labelNames: ['cache_type'],
            registers: [this.registry],
        });
        // Business Metrics
        this.entitiesCreated = new prom_client_1.Counter({
            name: `${config.metrics.prefix}entities_created_total`,
            help: 'Total entities created',
            labelNames: ['type', 'tenant'],
            registers: [this.registry],
        });
        this.relationshipsCreated = new prom_client_1.Counter({
            name: `${config.metrics.prefix}relationships_created_total`,
            help: 'Total relationships created',
            labelNames: ['type', 'tenant'],
            registers: [this.registry],
        });
        this.investigationsActive = new prom_client_1.Gauge({
            name: `${config.metrics.prefix}investigations_active`,
            help: 'Number of active investigations',
            labelNames: ['status', 'tenant'],
            registers: [this.registry],
        });
        this.aiRequestsTotal = new prom_client_1.Counter({
            name: `${config.metrics.prefix}ai_requests_total`,
            help: 'Total AI/ML requests',
            labelNames: ['model', 'operation', 'status'],
            registers: [this.registry],
        });
        this.aiRequestDuration = new prom_client_1.Histogram({
            name: `${config.metrics.prefix}ai_request_duration_seconds`,
            help: 'AI/ML request duration in seconds',
            labelNames: ['model', 'operation'],
            buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60],
            registers: [this.registry],
        });
        // SLO Metrics
        this.sloAvailability = new prom_client_1.Gauge({
            name: `${config.metrics.prefix}slo_availability_percent`,
            help: 'Current availability percentage',
            registers: [this.registry],
        });
        this.sloLatencyBudget = new prom_client_1.Gauge({
            name: `${config.metrics.prefix}slo_latency_budget_remaining`,
            help: 'Remaining latency error budget',
            registers: [this.registry],
        });
        this.sloErrorBudget = new prom_client_1.Gauge({
            name: `${config.metrics.prefix}slo_error_budget_remaining`,
            help: 'Remaining error budget',
            registers: [this.registry],
        });
    }
    /**
     * Get metrics in Prometheus format
     */
    async getMetrics() {
        return this.registry.metrics();
    }
    /**
     * Get metrics as JSON
     */
    async getMetricsJSON() {
        return this.registry.getMetricsAsJSON();
    }
    /**
     * HTTP request tracking middleware
     */
    httpMiddleware() {
        return (req, res, next) => {
            const start = process.hrtime.bigint();
            const requestSize = parseInt(req.get('content-length') || '0');
            this.activeConnections.inc();
            if (requestSize > 0) {
                this.httpRequestSize.observe({ method: req.method, path: this.normalizePath(req.path) }, requestSize);
            }
            const originalEnd = res.end;
            const self = this;
            res.end = function (...args) {
                const duration = Number(process.hrtime.bigint() - start) / 1e9;
                const normalizedPath = self.normalizePath(req.path);
                const tenant = req.headers['x-tenant-id']?.toString() || 'default';
                self.httpRequestsTotal.inc({
                    method: req.method,
                    path: normalizedPath,
                    status: res.statusCode.toString(),
                    tenant,
                });
                self.httpRequestDuration.observe({ method: req.method, path: normalizedPath, status: res.statusCode.toString() }, duration);
                const responseSize = parseInt(res.get('content-length') || '0');
                if (responseSize > 0) {
                    self.httpResponseSize.observe({ method: req.method, path: normalizedPath, status: res.statusCode.toString() }, responseSize);
                }
                self.activeConnections.dec();
                return originalEnd.apply(this, args);
            };
            next();
        };
    }
    /**
     * Normalize path for metrics (replace IDs with placeholders)
     */
    normalizePath(path) {
        return path
            .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
            .replace(/\/\d+/g, '/:id')
            .split('?')[0];
    }
}
exports.MetricsCollector = MetricsCollector;
/**
 * Health Check Manager
 */
class HealthCheckManager {
    checks = new Map();
    config;
    logger;
    constructor(config = defaultConfig) {
        this.config = config;
        this.logger = new StructuredLogger(config);
    }
    /**
     * Register a health check
     */
    registerCheck(name, check) {
        this.checks.set(name, check);
    }
    /**
     * Run all health checks
     */
    async runChecks() {
        const results = {};
        let overallStatus = 'healthy';
        for (const [name, check] of this.checks) {
            try {
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), this.config.healthCheck.timeout));
                results[name] = await Promise.race([check(), timeoutPromise]);
                if (results[name].status === 'unhealthy') {
                    overallStatus = 'unhealthy';
                }
                else if (results[name].status === 'degraded' && overallStatus !== 'unhealthy') {
                    overallStatus = 'degraded';
                }
            }
            catch (error) {
                results[name] = {
                    status: 'unhealthy',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
                overallStatus = 'unhealthy';
            }
        }
        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            service: this.config.serviceName,
            version: this.config.serviceVersion,
            checks: results,
        };
    }
    /**
     * Health check endpoint middleware
     */
    middleware() {
        return async (req, res) => {
            const health = await this.runChecks();
            const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
            res.status(statusCode).json(health);
        };
    }
}
exports.HealthCheckManager = HealthCheckManager;
/**
 * Correlation ID middleware
 */
function correlationIdMiddleware(headerName = 'x-correlation-id') {
    return (req, res, next) => {
        const correlationId = req.get(headerName) || crypto_1.default.randomUUID();
        // Attach to request for use in logging
        req.correlationId = correlationId;
        // Set response header
        res.setHeader(headerName, correlationId);
        next();
    };
}
/**
 * Create default observability setup
 */
function createObservabilitySetup(config = {}) {
    const mergedConfig = { ...defaultConfig, ...config };
    return {
        logger: new StructuredLogger(mergedConfig),
        metrics: new MetricsCollector(mergedConfig),
        healthCheck: new HealthCheckManager(mergedConfig),
    };
}
// Export default instances
exports.observability = createObservabilitySetup();
exports.default = exports.observability;
