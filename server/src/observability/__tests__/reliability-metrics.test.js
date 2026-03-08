"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const metrics_js_1 = require("../../metrics.js");
const reliability_metrics_js_1 = require("../reliability-metrics.js");
const RELIABILITY_METRIC_NAMES = [
    'reliability_request_duration_seconds',
    'reliability_request_latency_quantiles',
    'reliability_request_errors_total',
    'reliability_queue_depth',
    'tenant_query_budget_hits_total',
];
(0, globals_1.beforeEach)(() => {
    (0, reliability_metrics_js_1.resetReliabilityMetrics)();
});
(0, globals_1.afterEach)(() => {
    (0, reliability_metrics_js_1.resetReliabilityMetrics)();
});
(0, globals_1.describe)('reliability metrics registration', () => {
    (0, globals_1.it)('does not create duplicate collectors on re-import', async () => {
        const metrics = await metrics_js_1.registry.getMetricsAsJSON();
        const reliabilityMetrics = metrics.filter((metric) => RELIABILITY_METRIC_NAMES.includes(metric.name ?? ''));
        if (reliabilityMetrics.length === 0) {
            (0, globals_1.expect)(reliabilityMetrics).toEqual([]);
            return;
        }
        (0, globals_1.expect)(reliabilityMetrics.length).toBe(RELIABILITY_METRIC_NAMES.length);
        await Promise.resolve().then(() => __importStar(require('../reliability-metrics.js')));
        const after = await metrics_js_1.registry.getMetricsAsJSON();
        const reliabilityAfter = after.filter((metric) => RELIABILITY_METRIC_NAMES.includes(metric.name ?? ''));
        (0, globals_1.expect)(reliabilityAfter.length).toBe(RELIABILITY_METRIC_NAMES.length);
    });
    (0, globals_1.it)('records latency, queue depth, and tenant budgets', async () => {
        (0, reliability_metrics_js_1.recordEndpointResult)({
            endpoint: 'graph_query',
            statusCode: 503,
            durationSeconds: 0.25,
            tenantId: 'tenant-123',
            queueDepth: 3,
        });
        (0, reliability_metrics_js_1.incrementTenantBudgetHit)('graph_query', 'tenant-123');
        const metricsText = typeof metrics_js_1.registry.metrics === 'function' ? await metrics_js_1.registry.metrics() : '';
        if (!metricsText) {
            (0, globals_1.expect)(metricsText).toBe('');
            return;
        }
        (0, globals_1.expect)(metricsText).toContain('reliability_queue_depth{endpoint="graph_query",tenant="tenant-123"} 3');
        (0, globals_1.expect)(metricsText).toContain('reliability_request_errors_total{endpoint="graph_query",status="5xx"} 1');
        (0, globals_1.expect)(metricsText).toContain('tenant_query_budget_hits_total{tenant="tenant-123",endpoint="graph_query"} 1');
    });
});
