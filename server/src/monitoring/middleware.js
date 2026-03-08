"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpMetricsMiddleware = httpMetricsMiddleware;
exports.graphqlMetricsMiddleware = graphqlMetricsMiddleware;
exports.trackDbQuery = trackDbQuery;
exports.trackAiJob = trackAiJob;
exports.trackGraphOperation = trackGraphOperation;
exports.trackWebSocketConnection = trackWebSocketConnection;
exports.trackError = trackError;
exports.updateInvestigationMetrics = updateInvestigationMetrics;
const metrics_js_1 = require("./metrics.js");
const tracer_js_1 = require("../observability/tracer.js");
/**
 * Express middleware to track HTTP request metrics
 */
function httpMetricsMiddleware(req, res, next) {
    const start = Date.now();
    // Track request count
    metrics_js_1.httpRequestsTotal.inc({
        method: req.method,
        route: req.route?.path || req.path || 'unknown',
        status_code: 'pending',
    });
    // Override res.end to capture response metrics
    const originalEnd = res.end;
    // @ts-ignore
    res.end = function (...args) {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path || 'unknown';
        // Update metrics
        metrics_js_1.httpRequestDuration.observe({
            method: req.method,
            route,
            status_code: res.statusCode,
        }, duration);
        // Update total counter with actual status
        metrics_js_1.httpRequestsTotal.inc({
            method: req.method,
            route,
            status_code: res.statusCode,
        });
        if (route.startsWith('/api') ||
            route.startsWith('/graphql') ||
            route.startsWith('/monitoring')) {
            const tenantId = (req.headers['x-tenant-id'] || req.headers['x-tenant']) ?? 'unknown';
            metrics_js_1.businessApiCallsTotal.inc({
                service: req.baseUrl || 'maestro-api',
                route,
                status_code: String(res.statusCode),
                tenant: Array.isArray(tenantId)
                    ? tenantId[0]
                    : String(tenantId || 'unknown'),
            });
        }
        originalEnd.apply(this, args);
    };
    next();
}
/**
 * GraphQL middleware to track GraphQL operation metrics
 */
function graphqlMetricsMiddleware() {
    return {
        requestDidStart() {
            return {
                didResolveOperation(requestContext) {
                    const operationName = requestContext.request.operationName || 'anonymous';
                    const operationType = requestContext.operationName || 'unknown';
                    // Track GraphQL request
                    metrics_js_1.graphqlRequestsTotal.inc({
                        operation: operationName,
                        operation_type: operationType,
                        status: 'started',
                    });
                    requestContext.metrics = {
                        startTime: Date.now(),
                        operationName,
                        operationType,
                    };
                },
                didEncounterErrors(requestContext) {
                    const { operationName } = requestContext.metrics || {};
                    requestContext.errors.forEach((error) => {
                        metrics_js_1.graphqlErrors.inc({
                            operation: operationName || 'unknown',
                            error_type: error.constructor.name || 'GraphQLError',
                        });
                    });
                },
                willSendResponse(requestContext) {
                    const metricData = requestContext.metrics;
                    if (!metricData)
                        return;
                    const duration = (Date.now() - metricData.startTime) / 1000;
                    const hasErrors = requestContext.errors && requestContext.errors.length > 0;
                    // Track GraphQL request duration
                    metrics_js_1.graphqlRequestDuration.observe({
                        operation: metricData.operationName,
                        operation_type: metricData.operationType,
                    }, duration);
                    // Update request status
                    metrics_js_1.graphqlRequestsTotal.inc({
                        operation: metricData.operationName,
                        operation_type: metricData.operationType,
                        status: hasErrors ? 'error' : 'success',
                    });
                },
            };
        },
    };
}
/**
 * Database query wrapper to track DB metrics and spans
 */
function trackDbQuery(database, operation, queryFunction) {
    return async (...args) => {
        const start = Date.now();
        let status = 'success';
        const tracer = (0, tracer_js_1.getTracer)();
        return tracer.withSpan(`db.${database}.${operation}`, async (span) => {
            span.setAttributes({
                'db.system': database,
                'db.operation': operation,
            });
            try {
                const result = await queryFunction(...args);
                return result;
            }
            catch (error) {
                status = 'error';
                throw error;
            }
            finally {
                const duration = (Date.now() - start) / 1000;
                metrics_js_1.dbQueryDuration.observe({ database, operation }, duration);
                metrics_js_1.dbQueriesTotal.inc({
                    database,
                    operation,
                    status,
                });
            }
        }, { kind: tracer_js_1.SpanKind.CLIENT });
    };
}
/**
 * AI job tracking wrapper
 */
function trackAiJob(jobType, jobFunction) {
    return async (...args) => {
        const start = Date.now();
        let status = 'success';
        const tracer = (0, tracer_js_1.getTracer)();
        return tracer.withSpan(`ai.job.${jobType}`, async (span) => {
            span.setAttributes({
                'ai.job.type': jobType,
            });
            // Increment queued counter
            metrics_js_1.aiJobsQueued.inc({ job_type: jobType });
            // Increment processing counter
            metrics_js_1.aiJobsProcessing.inc({ job_type: jobType });
            try {
                const result = await jobFunction(...args);
                return result;
            }
            catch (error) {
                status = 'error';
                throw error;
            }
            finally {
                const duration = (Date.now() - start) / 1000;
                // Decrement processing counter
                metrics_js_1.aiJobsProcessing.dec({ job_type: jobType });
                // Decrement queued counter
                metrics_js_1.aiJobsQueued.dec({ job_type: jobType });
                // Track job duration and completion
                metrics_js_1.aiJobDuration.observe({ job_type: jobType, status }, duration);
                metrics_js_1.aiJobsTotal.inc({
                    job_type: jobType,
                    status,
                });
            }
        }, { kind: tracer_js_1.SpanKind.INTERNAL });
    };
}
/**
 * Graph operation tracking wrapper
 */
function trackGraphOperation(operation, investigationId, operationFunction) {
    return async (...args) => {
        const start = Date.now();
        const tracer = (0, tracer_js_1.getTracer)();
        return tracer.withSpan(`graph.operation.${operation}`, async (span) => {
            span.setAttributes({
                'graph.operation': operation,
                'graph.investigation_id': investigationId,
            });
            try {
                const result = await operationFunction(...args);
                return result;
            }
            finally {
                const duration = (Date.now() - start) / 1000;
                metrics_js_1.graphOperationDuration.observe({ operation, investigation_id: investigationId }, duration);
            }
        }, { kind: tracer_js_1.SpanKind.CLIENT });
    };
}
/**
 * WebSocket connection tracking
 */
function trackWebSocketConnection(io) {
    io.on('connection', (socket) => {
        metrics_js_1.websocketConnections.inc();
        socket.on('disconnect', () => {
            metrics_js_1.websocketConnections.dec();
        });
        // Track messages
        socket.use((packet, next) => {
            const [eventType] = packet;
            metrics_js_1.websocketMessages.inc({
                direction: 'incoming',
                event_type: eventType,
            });
            next();
        });
        // Override emit to track outgoing messages
        const originalEmit = socket.emit;
        socket.emit = function (eventType, ...args) {
            metrics_js_1.websocketMessages.inc({
                direction: 'outgoing',
                event_type: eventType,
            });
            return originalEmit.apply(this, [eventType, ...args]);
        };
    });
}
/**
 * Error tracking wrapper
 */
function trackError(module, errorType, severity = 'error') {
    metrics_js_1.applicationErrors.inc({
        module,
        error_type: errorType,
        severity,
    });
}
/**
 * Investigation metrics tracking
 */
function updateInvestigationMetrics(investigationId, operation, userId) {
    metrics_js_1.investigationOperations.inc({
        operation,
        user_id: userId,
    });
}
