"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otelRoute = otelRoute;
const api_1 = require("@opentelemetry/api");
function otelRoute(spanName) {
    const tracer = api_1.trace.getTracer('maestro-mcp');
    return function (req, res, next) {
        const name = `${spanName} ${req.method} ${req.baseUrl || ''}${req.route?.path || ''}`.trim();
        const span = tracer.startSpan(name);
        span.setAttribute('http.method', req.method);
        span.setAttribute('http.route', (req.baseUrl || '') + (req.route?.path || req.path));
        const user = req.user || {};
        if (user?.id)
            span.setAttribute('user.id', String(user.id));
        // Try to capture runId in params when present
        if (req.params?.id)
            span.setAttribute('run.id', req.params.id);
        const endSpan = () => {
            span.setAttribute('http.status_code', res.statusCode);
            if (res.statusCode >= 500)
                span.setStatus({ code: api_1.SpanStatusCode.ERROR });
            span.end();
            res.removeListener('finish', endSpan);
            res.removeListener('close', endSpan);
        };
        res.on('finish', endSpan);
        res.on('close', endSpan);
        return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), next);
    };
}
