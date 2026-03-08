"use strict";
// @ts-nocheck
/**
 * Correlation ID Middleware
 * Ensures every request has a unique ID for tracking across logs, metrics, and traces
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TENANT_ID_HEADER = exports.REQUEST_ID_HEADER = exports.CORRELATION_ID_HEADER = void 0;
exports.correlationIdMiddleware = correlationIdMiddleware;
exports.getCorrelationContext = getCorrelationContext;
exports.getUserContext = getUserContext;
const crypto_1 = require("crypto");
const api_1 = require("@opentelemetry/api");
const tracer_js_1 = require("../observability/tracer.js");
const logger_js_1 = require("../config/logger.js");
exports.CORRELATION_ID_HEADER = 'x-correlation-id';
exports.REQUEST_ID_HEADER = 'x-request-id';
exports.TENANT_ID_HEADER = 'x-tenant-id';
/**
 * Correlation ID middleware
 * - Generates or extracts correlation ID from request headers
 * - Adds OpenTelemetry trace/span IDs to request
 * - Injects IDs into response headers for client-side correlation
 * - Uses AsyncLocalStorage to propagate context to logger
 */
function correlationIdMiddleware(req, res, next) {
    // Generate or extract correlation ID
    const correlationId = req.headers[exports.CORRELATION_ID_HEADER] ||
        req.headers[exports.REQUEST_ID_HEADER] ||
        (0, crypto_1.randomUUID)();
    // Attach to request object
    req.correlationId = correlationId;
    // Get OpenTelemetry trace/span IDs if available
    const tracer = (0, tracer_js_1.getTracer)();
    const activeSpan = api_1.trace.getActiveSpan();
    req.traceId = activeSpan?.spanContext().traceId || tracer.getTraceId() || '';
    req.spanId = activeSpan?.spanContext().spanId || tracer.getSpanId() || '';
    // Fallback: honor upstream traceparent header for structured logging when no span is active
    if (!req.traceId && typeof req.headers['traceparent'] === 'string') {
        const [, inboundTraceId, inboundSpanId] = req.headers['traceparent'].split('-');
        req.traceId = inboundTraceId || req.traceId;
        req.spanId = inboundSpanId || req.spanId;
    }
    const tenantId = req.headers[exports.TENANT_ID_HEADER] || req.user?.tenant_id || 'unknown';
    // Add to current span if available
    if (req.traceId) {
        tracer.setAttribute('correlation.id', correlationId);
        tracer.setAttribute('correlation.request_id', correlationId);
        if (tenantId !== 'unknown') {
            tracer.setAttribute('tenant.id', tenantId);
        }
    }
    // Inject correlation ID into response headers
    res.setHeader(exports.CORRELATION_ID_HEADER, correlationId);
    res.setHeader(exports.REQUEST_ID_HEADER, correlationId);
    // Add trace ID to response if available (for debugging)
    if (req.traceId) {
        res.setHeader('x-trace-id', req.traceId);
    }
    // Setup AsyncLocalStorage context
    const store = new Map();
    store.set('correlationId', correlationId);
    store.set('requestId', correlationId);
    store.set('traceId', req.traceId);
    store.set('tenantId', tenantId);
    if (req.user) {
        store.set('principalId', req.user.sub || req.user.id);
    }
    logger_js_1.correlationStorage.run(store, () => {
        next();
    });
}
/**
 * Get correlation context from request
 * Use this in loggers and metrics to ensure consistent labeling
 */
function getCorrelationContext(req) {
    return {
        correlationId: req.correlationId,
        traceId: req.traceId,
        spanId: req.spanId,
        userId: req.user?.sub || req.user?.id,
        tenantId: req.user?.tenant_id || req.tenant_id,
    };
}
/**
 * Extract user context for observability
 */
function getUserContext(req) {
    const user = req.user;
    return {
        userId: user?.sub || user?.id,
        userEmail: user?.email,
        tenantId: user?.tenant_id,
        role: user?.role,
    };
}
