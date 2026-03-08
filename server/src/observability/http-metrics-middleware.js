"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpMetricsMiddleware = httpMetricsMiddleware;
const metrics_js_1 = require("./metrics.js");
const SERVICE_LABEL = process.env.OTEL_SERVICE_NAME || 'intelgraph-server';
function getRouteLabel(req) {
    if (req.route?.path)
        return req.route.path;
    if (req.baseUrl)
        return req.baseUrl;
    return req.path || 'unmatched';
}
function httpMetricsMiddleware(req, res, next) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
        const route = getRouteLabel(req);
        const statusCode = res.statusCode.toString();
        metrics_js_1.httpRequestsTotal
            .labels(req.method, route, statusCode, SERVICE_LABEL)
            .inc();
        metrics_js_1.httpRequestDurationSeconds
            .labels(req.method, route, statusCode, SERVICE_LABEL)
            .observe(durationSeconds);
        metrics_js_1.httpAvailabilityTotals.total += 1;
        if (statusCode.startsWith('5')) {
            metrics_js_1.httpAvailabilityTotals.errors += 1;
        }
        const successful = metrics_js_1.httpAvailabilityTotals.total - metrics_js_1.httpAvailabilityTotals.errors;
        const availability = metrics_js_1.httpAvailabilityTotals.total === 0
            ? 100
            : (successful / metrics_js_1.httpAvailabilityTotals.total) * 100;
        metrics_js_1.sloAvailability.labels('api-availability').set(availability);
    });
    next();
}
