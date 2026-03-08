"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCache = void 0;
exports.fetchAndCacheMetrics = fetchAndCacheMetrics;
const node_fetch_1 = __importDefault(require("node-fetch"));
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';
exports.metricsCache = {};
async function queryPrometheus(query) {
    try {
        const response = await (0, node_fetch_1.default)(`${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
            console.error(`Failed to query Prometheus: ${response.statusText}`);
            return undefined;
        }
        const data = (await response.json());
        if (data.status === 'success') {
            return data.data;
        }
        console.error(`Prometheus query failed: ${data.status}`);
        return undefined;
    }
    catch (error) {
        console.error(`Error fetching from Prometheus: ${error}`);
        return undefined;
    }
}
async function fetchAndCacheMetrics() {
    console.log('Fetching Prometheus metrics...');
    // Fetch p95 latency
    const p95Query = 'histogram_quantile(0.95, sum(rate(symphony_route_execute_latency_ms_bucket[5m])) by (le, model))';
    const p95Result = await queryPrometheus(p95Query);
    if (p95Result) {
        p95Result.result.forEach((item) => {
            const model = item.metric.model || 'unknown';
            exports.metricsCache[`p95_latency_${model}`] = parseFloat(item.value[1]);
        });
    }
    // Fetch error rate
    const errorRateQuery = 'sum(rate(symphony_errors_total[5m])) / sum(rate(symphony_route_execute_latency_ms_count[5m]))';
    const errorRateResult = await queryPrometheus(errorRateQuery);
    if (errorRateResult && errorRateResult.result.length > 0) {
        exports.metricsCache.error_rate = parseFloat(errorRateResult.result[0].value[1]);
    }
    // Fetch budget fraction
    const budgetFractionQuery = 'symphony_budget_fraction_used';
    const budgetFractionResult = await queryPrometheus(budgetFractionQuery);
    if (budgetFractionResult) {
        budgetFractionResult.result.forEach((item) => {
            const model = item.metric.model || 'unknown';
            exports.metricsCache[`budget_fraction_${model}`] = parseFloat(item.value[1]);
        });
    }
    console.log('Prometheus metrics fetched and cached.', exports.metricsCache);
}
// Initial fetch and set up interval
// fetchAndCacheMetrics();
// setInterval(fetchAndCacheMetrics, 60 * 1000); // Every 1 minute
