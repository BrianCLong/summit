"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sloMetrics = exports.SLOMetrics = void 0;
const prom_client_1 = require("prom-client");
const registry_js_1 = require("../metrics/registry.js");
class PercentileTracker {
    samples = [];
    maxSamples;
    constructor(maxSamples = 500) {
        this.maxSamples = maxSamples;
    }
    record(value) {
        if (!Number.isFinite(value))
            return;
        this.samples.push(value);
        if (this.samples.length > this.maxSamples) {
            this.samples.shift();
        }
    }
    percentile(p) {
        if (this.samples.length === 0)
            return 0;
        const sorted = [...this.samples].sort((a, b) => a - b);
        const rank = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(rank);
        const upper = Math.ceil(rank);
        if (lower === upper) {
            return sorted[lower];
        }
        const weight = rank - lower;
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
}
const gatewayHistogram = new prom_client_1.Histogram({
    name: 'crystal_gateway_latency_ms',
    help: 'Crystal gateway latency observations',
    labelNames: ['operation', 'method'],
    buckets: [50, 100, 200, 350, 500, 700, 900, 1200, 1500],
    registers: [registry_js_1.registry],
});
const graphHistogram = new prom_client_1.Histogram({
    name: 'crystal_graph_latency_ms',
    help: 'Crystal graph operation latency',
    labelNames: ['hops'],
    buckets: [50, 100, 200, 400, 800, 1200],
    registers: [registry_js_1.registry],
});
const costGauge = new prom_client_1.Gauge({
    name: 'crystal_budget_spend_usd',
    help: 'Budget spend per environment',
    labelNames: ['environment'],
    registers: [registry_js_1.registry],
});
const budgetAlerts = new prom_client_1.Counter({
    name: 'crystal_budget_alerts_total',
    help: 'Number of times the cost guardrail threshold was hit',
    labelNames: ['environment'],
    registers: [registry_js_1.registry],
});
const DEFAULT_BUDGETS = {
    dev: 1000,
    staging: 3000,
    prod: 18000,
    llm: 5000,
};
class SLOMetrics {
    gatewayRead = new PercentileTracker();
    gatewayWrite = new PercentileTracker();
    subscription = new PercentileTracker();
    graph = new PercentileTracker();
    budgets;
    constructor() {
        this.budgets = {
            dev: { limit: DEFAULT_BUDGETS.dev, spend: 0 },
            staging: { limit: DEFAULT_BUDGETS.staging, spend: 0 },
            prod: { limit: DEFAULT_BUDGETS.prod, spend: 0 },
            llm: { limit: DEFAULT_BUDGETS.llm, spend: 0 },
        };
    }
    observeGateway(operation, durationMs) {
        gatewayHistogram.observe({ operation, method: operation }, durationMs);
        if (operation === 'read')
            this.gatewayRead.record(durationMs);
        else if (operation === 'write')
            this.gatewayWrite.record(durationMs);
        else
            this.subscription.record(durationMs);
    }
    observeGraph(hops, durationMs) {
        const hopLabel = hops >= 3 ? '3' : String(hops);
        graphHistogram.observe({ hops: hopLabel }, durationMs);
        this.graph.record(durationMs);
    }
    recordCost(environment, amount) {
        const budget = this.budgets[environment];
        budget.spend = Math.max(0, budget.spend + amount);
        costGauge.set({ environment }, budget.spend);
        if (budget.spend >= budget.limit * 0.8) {
            budgetAlerts.inc({ environment });
        }
    }
    getSLOSnapshot() {
        return {
            gatewayReadP95: this.gatewayRead.percentile(95),
            gatewayReadP99: this.gatewayRead.percentile(99),
            gatewayWriteP95: this.gatewayWrite.percentile(95),
            gatewayWriteP99: this.gatewayWrite.percentile(99),
            subscriptionP95: this.subscription.percentile(95),
            graphHopP95: this.graph.percentile(95),
            graphHopP99: this.graph.percentile(99),
        };
    }
    getCostSnapshot() {
        const budgets = Object.keys(this.budgets).map((env) => {
            const { limit, spend } = this.budgets[env];
            return {
                environment: env,
                monthlyLimitUsd: limit,
                monthlySpendUsd: spend,
                alertThresholdHit: spend >= limit * 0.8,
            };
        });
        return { budgets };
    }
}
exports.SLOMetrics = SLOMetrics;
exports.sloMetrics = new SLOMetrics();
