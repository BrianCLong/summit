"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expressMiddleware = void 0;
const tracer_js_1 = require("../observability/tracer.js");
/**
 * Express middleware to attach trace context to response headers.
 * This ensures downstream clients can correlate requests with traces.
 *
 * Note: Tracer initialization should happen at application bootstrap (e.g. index.ts).
 * This middleware assumes the global tracer provider is already registered.
 */
const expressMiddleware = () => {
    return (req, res, next) => {
        // getTracer() retrieves the global singleton.
        // If not initialized, it returns a safe instance (usually) or throws depending on impl.
        // Given usage in index.ts, it should be ready.
        const tracer = (0, tracer_js_1.getTracer)();
        const span = tracer.getCurrentSpan();
        if (span) {
            const traceId = span.spanContext().traceId;
            // Standard header for trace correlation
            res.setHeader('X-Trace-ID', traceId);
            // Add standard attributes to the span from the request if not already auto-instrumented
            if (req.user) {
                span.setAttribute('user.id', req.user.id || 'unknown');
                span.setAttribute('user.tenant', req.user.tenantId || 'unknown');
            }
        }
        next();
    };
};
exports.expressMiddleware = expressMiddleware;
