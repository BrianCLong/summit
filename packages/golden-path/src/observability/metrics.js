"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMetrics = createMetrics;
exports.createHttpMetricsMiddleware = createHttpMetricsMiddleware;
exports.createTraceMiddleware = createTraceMiddleware;
// @ts-nocheck
const node_crypto_1 = require("node:crypto");
const prom_client_1 = require("prom-client");
function createMetrics() {
    const registry = new prom_client_1.Registry();
    (0, prom_client_1.collectDefaultMetrics)({ register: registry });
    const httpHistogram = new prom_client_1.Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'route', 'status'],
        registers: [registry],
    });
    const errorCounter = new prom_client_1.Counter({
        name: 'http_request_errors_total',
        help: 'Count of error responses',
        labelNames: ['route', 'status'],
        registers: [registry],
    });
    return { registry, httpHistogram, errorCounter };
}
function createHttpMetricsMiddleware(bundle) {
    return (req, res, next) => {
        const start = process.hrtime.bigint();
        res.on('finish', () => {
            const delta = Number(process.hrtime.bigint() - start) / 1_000_000_000;
            bundle.httpHistogram
                .labels(req.method, req.route?.path ?? req.path, res.statusCode.toString())
                .observe(delta);
            if (res.statusCode >= 500) {
                bundle.errorCounter
                    .labels(req.route?.path ?? req.path, res.statusCode.toString())
                    .inc();
            }
        });
        next();
    };
}
function createTraceMiddleware() {
    return (req, res, next) => {
        const traceId = req.headers['x-trace-id']?.toString() ?? (0, node_crypto_1.randomUUID)();
        res.locals.traceId = traceId;
        res.setHeader('x-trace-id', traceId);
        next();
    };
}
