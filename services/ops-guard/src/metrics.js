"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registry = void 0;
exports.startQueryTimer = startQueryTimer;
exports.completeQuery = completeQuery;
exports.trackCostPerInsight = trackCostPerInsight;
exports.renderMetrics = renderMetrics;
const prom_client_1 = __importDefault(require("prom-client"));
exports.registry = new prom_client_1.default.Registry();
const latencyHeatmap = new prom_client_1.default.Histogram({
    name: 'ops_guard_query_latency_ms',
    help: 'Query latency heatmap in milliseconds',
    buckets: [50, 100, 200, 350, 500, 750, 1000, 1250, 1500, 2000, 3000],
    registers: [exports.registry]
});
const saturationGauge = new prom_client_1.default.Gauge({
    name: 'ops_guard_saturation_ratio',
    help: 'Ratio of active queries relative to safe concurrency',
    registers: [exports.registry]
});
const activeQueriesGauge = new prom_client_1.default.Gauge({
    name: 'ops_guard_active_queries',
    help: 'Number of in-flight queries tracked by Ops Guard',
    registers: [exports.registry]
});
let activeCount = 0;
const costPerInsight = new prom_client_1.default.Histogram({
    name: 'ops_guard_cost_per_insight_cents',
    help: 'Histogram of cost-per-insight to highlight expensive workloads',
    buckets: [1, 5, 10, 25, 50, 75, 100, 200],
    registers: [exports.registry]
});
prom_client_1.default.collectDefaultMetrics({ register: exports.registry });
function startQueryTimer() {
    activeQueriesGauge.inc();
    activeCount += 1;
    return latencyHeatmap.startTimer();
}
function completeQuery(durationMs, safeConcurrency = 10) {
    activeQueriesGauge.dec();
    activeCount = Math.max(0, activeCount - 1);
    latencyHeatmap.observe(durationMs);
    const saturation = safeConcurrency === 0 ? 0 : activeCount / safeConcurrency;
    saturationGauge.set(Math.min(1, saturation));
}
function trackCostPerInsight(costCents, insights) {
    if (insights <= 0)
        return;
    costPerInsight.observe(costCents / insights);
}
async function renderMetrics() {
    return exports.registry.metrics();
}
