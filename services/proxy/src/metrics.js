"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetFraction = exports.routeExecuteLatency = exports.httpReqLatency = exports.register = void 0;
exports.metricsHandler = metricsHandler;
exports.timed = timed;
const prom_client_1 = __importDefault(require("prom-client"));
exports.register = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register: exports.register });
exports.httpReqLatency = new prom_client_1.default.Histogram({
    name: 'symphony_http_request_duration_seconds',
    help: 'HTTP request latency',
    labelNames: ['route', 'method', 'status'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
exports.register.registerMetric(exports.httpReqLatency);
exports.routeExecuteLatency = new prom_client_1.default.Histogram({
    name: 'symphony_route_execute_latency_seconds',
    help: 'Latency for /route/execute',
    labelNames: ['model', 'stream', 'status'],
});
exports.register.registerMetric(exports.routeExecuteLatency);
exports.budgetFraction = new prom_client_1.default.Gauge({
    name: 'symphony_model_budget_fraction_used',
    help: 'Fraction of daily budget used',
    labelNames: ['model'],
});
exports.register.registerMetric(exports.budgetFraction);
function metricsHandler(req, res) {
    res.set('Content-Type', exports.register.contentType);
    res.end(exports.register.metrics());
}
function timed(routeLabel) {
    return (req, res, next) => {
        const end = exports.httpReqLatency.startTimer({
            route: routeLabel,
            method: req.method,
        });
        res.on('finish', () => end({ status: String(res.statusCode) }));
        next();
    };
}
