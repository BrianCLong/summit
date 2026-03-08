"use strict";
/**
 * CompanyOS Observability SDK - Middleware Module
 *
 * Provides Express middleware for automatic observability instrumentation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsMiddleware = metricsMiddleware;
exports.tracingMiddleware = tracingMiddleware;
exports.requestLoggingMiddleware = requestLoggingMiddleware;
exports.metricsHandler = metricsHandler;
exports.errorMiddleware = errorMiddleware;
exports.createObservabilityMiddleware = createObservabilityMiddleware;
exports.setupObservability = setupObservability;
const api_1 = require("@opentelemetry/api");
const index_js_1 = require("../metrics/index.js");
const index_js_2 = require("../logging/index.js");
const index_js_3 = require("../tracing/index.js");
const index_js_4 = require("../health/index.js");
// =============================================================================
// METRICS MIDDLEWARE
// =============================================================================
/**
 * Express middleware for collecting HTTP metrics
 */
function metricsMiddleware(config) {
    const { service, excludeRoutes = ['/health', '/metrics', '/ready', '/live'], routeNormalizer } = config;
    return (req, res, next) => {
        // Skip excluded routes
        const route = routeNormalizer?.(req) || req.route?.path || req.path;
        if (excludeRoutes.some((r) => route.startsWith(r))) {
            return next();
        }
        const startTime = process.hrtime.bigint();
        // Track in-flight requests
        index_js_1.httpRequestsInFlight.labels({ service: service.name, method: req.method }).inc();
        // Record metrics on response finish
        res.on('finish', () => {
            const duration = Number(process.hrtime.bigint() - startTime) / 1e9; // Convert to seconds
            index_js_1.httpRequestsTotal
                .labels({
                service: service.name,
                method: req.method,
                route,
                status_code: String(res.statusCode),
            })
                .inc();
            index_js_1.httpRequestDuration
                .labels({
                service: service.name,
                method: req.method,
                route,
                status_code: String(res.statusCode),
            })
                .observe(duration);
            index_js_1.httpRequestsInFlight.labels({ service: service.name, method: req.method }).dec();
            // Record errors
            if (res.statusCode >= 500) {
                (0, index_js_1.recordError)('http_5xx', 'high', service.name);
            }
            else if (res.statusCode >= 400) {
                (0, index_js_1.recordError)('http_4xx', 'low', service.name);
            }
        });
        next();
    };
}
// =============================================================================
// TRACING MIDDLEWARE
// =============================================================================
/**
 * Express middleware for distributed tracing
 */
function tracingMiddleware(config) {
    const { service, excludeRoutes = ['/health', '/metrics', '/ready', '/live'], routeNormalizer } = config;
    const tracer = (0, index_js_3.getTracer)(service.name, service.version);
    return (req, res, next) => {
        const route = routeNormalizer?.(req) || req.route?.path || req.path;
        // Skip excluded routes
        if (excludeRoutes.some((r) => route.startsWith(r))) {
            return next();
        }
        // Extract parent context from headers
        const parentContext = (0, index_js_3.extractContext)(req.headers);
        // Start span
        const span = tracer.startSpan(`HTTP ${req.method} ${route}`, {
            kind: api_1.SpanKind.SERVER,
            attributes: {
                'http.method': req.method,
                'http.url': req.url,
                'http.route': route,
                'http.scheme': req.protocol,
                'http.host': req.hostname,
                'http.user_agent': req.get('user-agent') || '',
                'http.request_content_length': req.get('content-length'),
                'service.name': service.name,
                'service.version': service.version,
            },
        }, parentContext);
        // Store span in request for downstream access
        req.span = span;
        // Inject trace context into response headers
        const responseHeaders = {};
        api_1.context.with(api_1.trace.setSpan(parentContext, span), () => {
            (0, index_js_3.injectContext)(responseHeaders);
        });
        Object.entries(responseHeaders).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
        // Record response
        res.on('finish', () => {
            span.setAttributes({
                'http.status_code': res.statusCode,
                'http.response_content_length': res.get('content-length'),
            });
            if (res.statusCode >= 400) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: `HTTP ${res.statusCode}`,
                });
            }
            else {
                span.setStatus({ code: api_1.SpanStatusCode.OK });
            }
            span.end();
        });
        // Continue with span context
        api_1.context.with(api_1.trace.setSpan(parentContext, span), () => {
            next();
        });
    };
}
// =============================================================================
// REQUEST LOGGING MIDDLEWARE
// =============================================================================
/**
 * Express middleware for request logging
 */
function requestLoggingMiddleware(config) {
    const { service, excludeRoutes = ['/health', '/metrics', '/ready', '/live'] } = config;
    const logger = (0, index_js_2.createLogger)({ service });
    return (req, res, next) => {
        // Skip excluded routes
        if (excludeRoutes.some((r) => req.path.startsWith(r))) {
            return next();
        }
        const startTime = Date.now();
        const requestId = req.headers['x-request-id'] || generateRequestId();
        // Create child logger with request context
        const reqLogger = (0, index_js_2.createRequestLogger)(logger, {
            requestId,
            userId: req.user?.id,
            tenantId: req.tenant?.id,
        });
        // Attach logger to request
        req.log = reqLogger;
        // Log request start
        reqLogger.info({
            req: {
                method: req.method,
                url: req.url,
                headers: {
                    'user-agent': req.get('user-agent'),
                    'content-type': req.get('content-type'),
                },
            },
        }, 'Request started');
        // Log request completion
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
            reqLogger[level]({
                res: {
                    statusCode: res.statusCode,
                },
                duration_ms: duration,
            }, 'Request completed');
        });
        next();
    };
}
function generateRequestId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}
// =============================================================================
// METRICS ENDPOINT
// =============================================================================
/**
 * Express handler for Prometheus metrics endpoint
 */
function metricsHandler() {
    return async (_req, res) => {
        try {
            res.set('Content-Type', (0, index_js_1.getMetricsContentType)());
            res.send(await (0, index_js_1.getMetrics)());
        }
        catch (error) {
            res.status(500).send('Error collecting metrics');
        }
    };
}
// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
/**
 * Express error handling middleware with observability
 */
function errorMiddleware(config) {
    const { service } = config;
    const logger = (0, index_js_2.createLogger)({ service });
    return (err, req, res, _next) => {
        // Record error metrics
        (0, index_js_1.recordError)(err.name || 'UnknownError', 'high', service.name);
        // Log error
        const reqLogger = req.log || logger;
        reqLogger.error({
            err,
            req: {
                method: req.method,
                url: req.url,
            },
        }, 'Request error');
        // Record exception in span
        const span = req.span;
        if (span) {
            span.recordException(err);
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: err.message,
            });
        }
        // Send error response
        const statusCode = err.statusCode || err.status || 500;
        res.status(statusCode).json({
            error: {
                message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
                ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
            },
        });
    };
}
/**
 * Create all observability middleware for a service
 */
function createObservabilityMiddleware(config) {
    // Initialize health checks
    (0, index_js_4.initializeHealth)(config.service);
    return {
        metrics: metricsMiddleware(config),
        tracing: tracingMiddleware(config),
        logging: requestLoggingMiddleware(config),
        metricsEndpoint: metricsHandler(),
        errorHandler: errorMiddleware(config),
        health: (0, index_js_4.createHealthRoutes)(),
    };
}
// =============================================================================
// EXPRESS APP SETUP HELPER
// =============================================================================
/**
 * Setup observability on an Express app
 */
function setupObservability(app, config) {
    const middleware = createObservabilityMiddleware(config);
    // Apply middleware
    app.use(middleware.logging);
    app.use(middleware.tracing);
    app.use(middleware.metrics);
    // Setup routes
    app.get('/metrics', middleware.metricsEndpoint);
    app.get('/health', middleware.health.liveness);
    app.get('/health/live', middleware.health.liveness);
    app.get('/health/ready', middleware.health.readiness);
    app.get('/health/detailed', middleware.health.detailed);
    return middleware;
}
