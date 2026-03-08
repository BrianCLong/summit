"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ragStaleness = exports.errorsTotal = exports.powerWindowOpen = exports.budgetFraction = exports.decisionsTotal = exports.tokensTotal = exports.routeLatency = exports.metricsRouter = void 0;
exports.registerDefaultMetrics = registerDefaultMetrics;
const express_1 = __importDefault(require("express"));
const prom_client_1 = __importDefault(require("prom-client"));
exports.metricsRouter = express_1.default.Router();
// Histograms/gauges/counters
exports.routeLatency = new prom_client_1.default.Histogram({
    name: 'symphony_route_execute_latency_ms',
    help: 'Route execute latency',
    labelNames: ['model', 'tenant'],
    buckets: [50, 100, 200, 400, 800, 1200, 2000, 4000, 8000],
});
exports.tokensTotal = new prom_client_1.default.Counter({
    name: 'symphony_tokens_total',
    help: 'Token usage',
    labelNames: ['model', 'tenant', 'type'],
});
exports.decisionsTotal = new prom_client_1.default.Counter({
    name: 'symphony_route_decisions_total',
    help: 'Decisions taken',
    labelNames: ['model', 'reason'],
});
exports.budgetFraction = new prom_client_1.default.Gauge({
    name: 'symphony_budget_fraction_used',
    help: 'Budget fraction used per model',
    labelNames: ['model'],
});
exports.powerWindowOpen = new prom_client_1.default.Gauge({
    name: 'symphony_power_window_open',
    help: 'Power window open (0/1)',
    labelNames: ['model'],
});
exports.errorsTotal = new prom_client_1.default.Counter({
    name: 'symphony_errors_total',
    help: 'Errors by route',
    labelNames: ['route', 'code'],
});
exports.ragStaleness = new prom_client_1.default.Gauge({
    name: 'rag_index_staleness_seconds',
    help: 'RAG staleness seconds',
    labelNames: ['corpus'],
});
exports.metricsRouter.get('/', async (_req, res) => {
    try {
        res.set('Content-Type', prom_client_1.default.register.contentType);
        res.end(await prom_client_1.default.register.metrics());
    }
    catch (err) {
        res.status(500).end(err?.message || 'metrics error');
    }
});
function registerDefaultMetrics() {
    prom_client_1.default.collectDefaultMetrics({ register: prom_client_1.default.register });
}
