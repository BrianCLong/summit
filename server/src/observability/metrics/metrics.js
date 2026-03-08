"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = void 0;
// @ts-nocheck
const metrics_js_1 = require("../metrics.js");
const prom_client_1 = require("prom-client");
// Pre-defined metrics configurations to ensure consistency and prevent runtime errors
const METRIC_DEFINITIONS = {
    'summit_api_requests_total': {
        type: 'counter',
        help: 'Total HTTP requests',
        labelNames: ['method', 'route', 'status', 'tenantId']
    },
    'summit_api_latency_seconds': {
        type: 'histogram',
        help: 'API Latency distribution',
        labelNames: ['method', 'route']
    },
    'summit_errors_total': {
        type: 'counter',
        help: 'Global error counter',
        labelNames: ['code', 'component', 'tenantId']
    },
    'summit_maestro_runs_total': {
        type: 'counter',
        help: 'Maestro orchestration runs',
        labelNames: ['status', 'tenantId']
    },
    'summit_maestro_run_duration_seconds': {
        type: 'histogram',
        help: 'Time to complete a run',
        labelNames: ['status', 'tenantId']
    },
    'summit_maestro_task_duration_seconds': {
        type: 'histogram',
        help: 'Time to complete a task',
        labelNames: ['status', 'agent', 'tenantId']
    },
    'summit_llm_requests_total': {
        type: 'counter',
        help: 'LLM calls',
        labelNames: ['provider', 'model', 'status', 'tenantId']
    },
    'summit_llm_latency_seconds': {
        type: 'histogram',
        help: 'LLM latency',
        labelNames: ['provider', 'model']
    },
    'summit_llm_tokens_total': {
        type: 'counter',
        help: 'LLM token usage',
        labelNames: ['provider', 'model', 'kind']
    },
    'summit_webhook_deliveries_total': {
        type: 'counter',
        help: 'Webhook deliveries',
        labelNames: ['status', 'provider']
    }
};
class PrometheusMetricsService {
    metrics = new Map();
    constructor() {
        this.initializeMetrics();
    }
    initializeMetrics() {
        for (const [name, config] of Object.entries(METRIC_DEFINITIONS)) {
            if (typeof metrics_js_1.registry.getSingleMetric === 'function' && metrics_js_1.registry.getSingleMetric(name)) {
                // Already registered, grab it
                this.metrics.set(name, metrics_js_1.registry.getSingleMetric(name));
                continue;
            }
            let metric;
            switch (config.type) {
                case 'counter':
                    metric = new prom_client_1.Counter({
                        name,
                        help: config.help,
                        labelNames: config.labelNames,
                        registers: [metrics_js_1.registry]
                    });
                    break;
                case 'histogram':
                    metric = new prom_client_1.Histogram({
                        name,
                        help: config.help,
                        labelNames: config.labelNames,
                        registers: [metrics_js_1.registry],
                        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60]
                    });
                    break;
                case 'gauge':
                    metric = new prom_client_1.Gauge({
                        name,
                        help: config.help,
                        labelNames: config.labelNames,
                        registers: [metrics_js_1.registry]
                    });
                    break;
            }
            this.metrics.set(name, metric);
        }
    }
    incrementCounter(name, labels = {}, value = 1) {
        const metric = this.metrics.get(name);
        if (metric && metric instanceof prom_client_1.Counter) {
            metric.inc(labels, value);
        }
        else {
            // Fallback or log warning for undefined metric
            // For now, we allow dynamic creation only if explicitly not strict, but strict is safer.
            // We will try to register it dynamically if missing, but using provided labels.
            // This mimics previous behavior but is risky.
            // Better to just ignore or warn in MVP to enforce standards.
        }
    }
    observeHistogram(name, value, labels = {}) {
        const metric = this.metrics.get(name);
        if (metric && metric instanceof prom_client_1.Histogram) {
            metric.observe(labels, value);
        }
    }
    setGauge(name, value, labels = {}) {
        const metric = this.metrics.get(name);
        if (metric && metric instanceof prom_client_1.Gauge) {
            metric.set(labels, value);
        }
    }
}
exports.metrics = new PrometheusMetricsService();
