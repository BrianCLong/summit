"use strict";
/**
 * @intelgraph/metrics-exporter
 *
 * Prometheus metrics exporter for IntelGraph services.
 * Provides golden signals (latency, traffic, errors, saturation) and business metrics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsExporter = void 0;
exports.createMetricsMiddleware = createMetricsMiddleware;
exports.createMetricsEndpoint = createMetricsEndpoint;
const prom_client_1 = require("prom-client");
/**
 * MetricsExporter - Centralized metrics collection for IntelGraph services
 */
class MetricsExporter {
    registry;
    config;
    // Golden Signals - Latency
    httpRequestDuration;
    graphqlRequestDuration;
    databaseQueryDuration;
    // Golden Signals - Traffic
    httpRequestsTotal;
    graphqlRequestsTotal;
    activeConnections;
    // Golden Signals - Errors
    httpErrorsTotal;
    graphqlErrorsTotal;
    databaseErrorsTotal;
    // Golden Signals - Saturation
    cpuUsage;
    memoryUsage;
    databaseConnectionPool;
    // Cost & Budget Metrics
    costTotal;
    budgetUtilization;
    budgetViolations;
    slowQueriesKilled;
    // Business Metrics
    entitiesCreated;
    relationshipsCreated;
    investigationsCreated;
    copilotRequests;
    constructor(config) {
        this.config = {
            environment: 'development',
            enableDefaultMetrics: true,
            defaultMetricsInterval: 10000,
            labels: {},
            ...config,
        };
        this.registry = new prom_client_1.Registry();
        // Add default labels to all metrics
        this.registry.setDefaultLabels({
            service: this.config.serviceName,
            environment: this.config.environment,
            ...this.config.labels,
        });
        // Initialize golden signal metrics
        this.initializeLatencyMetrics();
        this.initializeTrafficMetrics();
        this.initializeErrorMetrics();
        this.initializeSaturationMetrics();
        // Initialize cost metrics
        this.initializeCostMetrics();
        // Initialize business metrics
        this.initializeBusinessMetrics();
        // Collect default Node.js metrics
        if (this.config.enableDefaultMetrics) {
            (0, prom_client_1.collectDefaultMetrics)({
                register: this.registry,
                prefix: 'intelgraph_',
                gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
                eventLoopMonitoringPrecision: 10,
            });
        }
    }
    /**
     * Initialize latency metrics (golden signal #1)
     */
    initializeLatencyMetrics() {
        this.httpRequestDuration = new prom_client_1.Histogram({
            name: 'intelgraph_http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
            registers: [this.registry],
        });
        this.graphqlRequestDuration = new prom_client_1.Histogram({
            name: 'intelgraph_graphql_request_duration_seconds',
            help: 'GraphQL request duration in seconds',
            labelNames: ['operation_name', 'operation_type', 'success'],
            buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
            registers: [this.registry],
        });
        this.databaseQueryDuration = new prom_client_1.Histogram({
            name: 'intelgraph_database_query_duration_seconds',
            help: 'Database query duration in seconds',
            labelNames: ['database', 'operation', 'success'],
            buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
            registers: [this.registry],
        });
    }
    /**
     * Initialize traffic metrics (golden signal #2)
     */
    initializeTrafficMetrics() {
        this.httpRequestsTotal = new prom_client_1.Counter({
            name: 'intelgraph_http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code'],
            registers: [this.registry],
        });
        this.graphqlRequestsTotal = new prom_client_1.Counter({
            name: 'intelgraph_graphql_requests_total',
            help: 'Total number of GraphQL requests',
            labelNames: ['operation_name', 'operation_type'],
            registers: [this.registry],
        });
        this.activeConnections = new prom_client_1.Gauge({
            name: 'intelgraph_active_connections',
            help: 'Number of active connections',
            labelNames: ['type'],
            registers: [this.registry],
        });
    }
    /**
     * Initialize error metrics (golden signal #3)
     */
    initializeErrorMetrics() {
        this.httpErrorsTotal = new prom_client_1.Counter({
            name: 'intelgraph_http_errors_total',
            help: 'Total number of HTTP errors',
            labelNames: ['method', 'route', 'status_code', 'error_type'],
            registers: [this.registry],
        });
        this.graphqlErrorsTotal = new prom_client_1.Counter({
            name: 'intelgraph_graphql_errors_total',
            help: 'Total number of GraphQL errors',
            labelNames: ['operation_name', 'error_code'],
            registers: [this.registry],
        });
        this.databaseErrorsTotal = new prom_client_1.Counter({
            name: 'intelgraph_database_errors_total',
            help: 'Total number of database errors',
            labelNames: ['database', 'operation', 'error_type'],
            registers: [this.registry],
        });
    }
    /**
     * Initialize saturation metrics (golden signal #4)
     */
    initializeSaturationMetrics() {
        this.cpuUsage = new prom_client_1.Gauge({
            name: 'intelgraph_cpu_usage_percent',
            help: 'CPU usage percentage',
            registers: [this.registry],
        });
        this.memoryUsage = new prom_client_1.Gauge({
            name: 'intelgraph_memory_usage_bytes',
            help: 'Memory usage in bytes',
            labelNames: ['type'],
            registers: [this.registry],
        });
        this.databaseConnectionPool = new prom_client_1.Gauge({
            name: 'intelgraph_database_connection_pool',
            help: 'Database connection pool metrics',
            labelNames: ['database', 'state'],
            registers: [this.registry],
        });
    }
    /**
     * Initialize cost and budget metrics
     */
    initializeCostMetrics() {
        this.costTotal = new prom_client_1.Counter({
            name: 'intelgraph_cost_total_dollars',
            help: 'Total cost in dollars',
            labelNames: ['tenant_id', 'operation', 'resource_type'],
            registers: [this.registry],
        });
        this.budgetUtilization = new prom_client_1.Gauge({
            name: 'intelgraph_budget_utilization_percent',
            help: 'Budget utilization percentage',
            labelNames: ['tenant_id', 'period'],
            registers: [this.registry],
        });
        this.budgetViolations = new prom_client_1.Counter({
            name: 'intelgraph_budget_violations_total',
            help: 'Total number of budget violations',
            labelNames: ['tenant_id', 'violation_type'],
            registers: [this.registry],
        });
        this.slowQueriesKilled = new prom_client_1.Counter({
            name: 'intelgraph_slow_queries_killed_total',
            help: 'Total number of slow queries killed',
            labelNames: ['database', 'tenant_id'],
            registers: [this.registry],
        });
    }
    /**
     * Initialize business domain metrics
     */
    initializeBusinessMetrics() {
        this.entitiesCreated = new prom_client_1.Counter({
            name: 'intelgraph_entities_created_total',
            help: 'Total number of entities created',
            labelNames: ['tenant_id', 'entity_type'],
            registers: [this.registry],
        });
        this.relationshipsCreated = new prom_client_1.Counter({
            name: 'intelgraph_relationships_created_total',
            help: 'Total number of relationships created',
            labelNames: ['tenant_id', 'relationship_type'],
            registers: [this.registry],
        });
        this.investigationsCreated = new prom_client_1.Counter({
            name: 'intelgraph_investigations_created_total',
            help: 'Total number of investigations created',
            labelNames: ['tenant_id'],
            registers: [this.registry],
        });
        this.copilotRequests = new prom_client_1.Counter({
            name: 'intelgraph_copilot_requests_total',
            help: 'Total number of copilot requests',
            labelNames: ['tenant_id', 'request_type'],
            registers: [this.registry],
        });
    }
    /**
     * Record HTTP request metrics
     */
    recordHttpRequest(metrics) {
        const labels = {
            method: metrics.method,
            route: metrics.route,
            status_code: metrics.statusCode.toString(),
        };
        this.httpRequestDuration.observe(labels, metrics.duration);
        this.httpRequestsTotal.inc(labels);
        if (!metrics.success) {
            this.httpErrorsTotal.inc({
                ...labels,
                error_type: metrics.statusCode >= 500 ? 'server_error' : 'client_error',
            });
        }
    }
    /**
     * Record GraphQL request metrics
     */
    recordGraphQLRequest(operationName, operationType, duration, success, errorCode) {
        const labels = {
            operation_name: operationName,
            operation_type: operationType,
        };
        this.graphqlRequestDuration.observe({ ...labels, success: success.toString() }, duration);
        this.graphqlRequestsTotal.inc(labels);
        if (!success && errorCode) {
            this.graphqlErrorsTotal.inc({
                operation_name: operationName,
                error_code: errorCode,
            });
        }
    }
    /**
     * Record database query metrics
     */
    recordDatabaseQuery(metrics) {
        const labels = {
            database: metrics.database,
            operation: metrics.operation,
            success: metrics.success.toString(),
        };
        this.databaseQueryDuration.observe(labels, metrics.duration);
        if (!metrics.success) {
            this.databaseErrorsTotal.inc({
                database: metrics.database,
                operation: metrics.operation,
                error_type: 'query_error',
            });
        }
    }
    /**
     * Record cost metrics
     */
    recordCost(metrics) {
        this.costTotal.inc({
            tenant_id: metrics.tenantId,
            operation: metrics.operation,
            resource_type: metrics.resourceType,
        }, metrics.cost);
    }
    /**
     * Update budget utilization
     */
    updateBudgetUtilization(tenantId, period, percentage) {
        this.budgetUtilization.set({ tenant_id: tenantId, period }, percentage);
    }
    /**
     * Record budget violation
     */
    recordBudgetViolation(tenantId, violationType) {
        this.budgetViolations.inc({ tenant_id: tenantId, violation_type: violationType });
    }
    /**
     * Record slow query kill
     */
    recordSlowQueryKill(database, tenantId) {
        this.slowQueriesKilled.inc({ database, tenant_id: tenantId });
    }
    /**
     * Record entity creation
     */
    recordEntityCreated(tenantId, entityType) {
        this.entitiesCreated.inc({ tenant_id: tenantId, entity_type: entityType });
    }
    /**
     * Record relationship creation
     */
    recordRelationshipCreated(tenantId, relationshipType) {
        this.relationshipsCreated.inc({
            tenant_id: tenantId,
            relationship_type: relationshipType,
        });
    }
    /**
     * Record investigation creation
     */
    recordInvestigationCreated(tenantId) {
        this.investigationsCreated.inc({ tenant_id: tenantId });
    }
    /**
     * Record copilot request
     */
    recordCopilotRequest(tenantId, requestType) {
        this.copilotRequests.inc({ tenant_id: tenantId, request_type: requestType });
    }
    /**
     * Update active connections
     */
    updateActiveConnections(type, count) {
        this.activeConnections.set({ type }, count);
    }
    /**
     * Update database connection pool
     */
    updateDatabaseConnectionPool(database, state, count) {
        this.databaseConnectionPool.set({ database, state }, count);
    }
    /**
     * Get metrics in Prometheus format
     */
    async getMetrics() {
        return this.registry.metrics();
    }
    /**
     * Get metrics registry
     */
    getRegistry() {
        return this.registry;
    }
    /**
     * Reset all metrics (useful for testing)
     */
    reset() {
        this.registry.resetMetrics();
    }
}
exports.MetricsExporter = MetricsExporter;
/**
 * Create Express/Fastify middleware for automatic HTTP metrics collection
 */
function createMetricsMiddleware(exporter) {
    return (req, res, next) => {
        const start = process.hrtime.bigint();
        // Track response finish
        res.on('finish', () => {
            const duration = Number(process.hrtime.bigint() - start) / 1e9; // Convert to seconds
            exporter.recordHttpRequest({
                method: req.method,
                route: req.route?.path || req.path || 'unknown',
                statusCode: res.statusCode,
                duration,
                success: res.statusCode < 400,
            });
        });
        next();
    };
}
/**
 * Create metrics endpoint handler
 */
function createMetricsEndpoint(exporter) {
    return async (req, res) => {
        try {
            const metrics = await exporter.getMetrics();
            res.setHeader('Content-Type', exporter.getRegistry().contentType);
            res.send(metrics);
        }
        catch (error) {
            res.status(500).send('Error collecting metrics');
        }
    };
}
exports.default = MetricsExporter;
