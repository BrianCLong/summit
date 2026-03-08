"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultQueryMonitor = exports.IntelGraphQueryMonitor = void 0;
const prom_client_1 = require("prom-client");
const VARIABLE_LENGTH_PATTERN = /\[[^\]]*\*[^\]]*\]/g;
function deriveSeverity(observed, threshold) {
    if (observed >= threshold * 2) {
        return 'high';
    }
    if (observed >= threshold * 1.25) {
        return 'medium';
    }
    return 'low';
}
class IntelGraphQueryMonitor {
    registry;
    thresholds;
    alertSink;
    fanOutHistogram;
    expansionHistogram;
    latencyHistogram;
    pathCostHistogram;
    anomalyCounter;
    throttleCounter;
    constructor(options = {}) {
        this.registry = options.registry ?? new prom_client_1.Registry();
        this.thresholds = {
            fanOut: options.thresholds?.fanOut ?? 120,
            expansionDepth: options.thresholds?.expansionDepth ?? 4,
            repetition: options.thresholds?.repetition ?? 2,
            throttleLimit: options.thresholds?.throttleLimit ?? 50,
        };
        this.alertSink = options.alertSink;
        this.fanOutHistogram = new prom_client_1.Histogram({
            name: 'intelgraph_query_fanout',
            help: 'Rows returned by IntelGraph queries.',
            buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
            labelNames: ['tenant'],
            registers: [this.registry],
        });
        this.expansionHistogram = new prom_client_1.Histogram({
            name: 'intelgraph_query_expansion_depth',
            help: 'Depth of relationship expansions detected in queries.',
            buckets: [0, 1, 2, 3, 4, 6, 8, 12],
            labelNames: ['tenant'],
            registers: [this.registry],
        });
        this.latencyHistogram = new prom_client_1.Histogram({
            name: 'intelgraph_query_latency_ms',
            help: 'Latency distribution for IntelGraph query handling.',
            buckets: [10, 25, 50, 100, 250, 500, 1000, 2000],
            labelNames: ['tenant'],
            registers: [this.registry],
        });
        this.pathCostHistogram = new prom_client_1.Histogram({
            name: 'intelgraph_query_path_cost',
            help: 'Composite expansion and variable-length traversal cost.',
            buckets: [0, 1, 2, 4, 6, 8, 12],
            labelNames: ['tenant'],
            registers: [this.registry],
        });
        this.anomalyCounter = new prom_client_1.Counter({
            name: 'intelgraph_query_anomalies_total',
            help: 'Total IntelGraph query anomalies by type and severity.',
            labelNames: ['type', 'severity'],
            registers: [this.registry],
        });
        this.throttleCounter = new prom_client_1.Counter({
            name: 'intelgraph_query_throttles_total',
            help: 'Total IntelGraph query throttles applied.',
            labelNames: ['reason'],
            registers: [this.registry],
        });
    }
    observe(observation) {
        const insights = this.buildInsights(observation);
        const anomalies = [];
        if (insights.fanOut > this.thresholds.fanOut) {
            const severity = deriveSeverity(insights.fanOut, this.thresholds.fanOut);
            anomalies.push({
                type: 'fan_out',
                severity,
                message: `High fan-out detected (${insights.fanOut} rows).`,
                observed: insights.fanOut,
                threshold: this.thresholds.fanOut,
            });
        }
        if (insights.repeatedExpansions > this.thresholds.repetition) {
            const severity = deriveSeverity(insights.repeatedExpansions, this.thresholds.repetition);
            anomalies.push({
                type: 'repetitive_expansion',
                severity,
                message: `Repeated expansions detected (${insights.repeatedExpansions}).`,
                observed: insights.repeatedExpansions,
                threshold: this.thresholds.repetition,
            });
        }
        if (insights.expansionDepth > this.thresholds.expansionDepth ||
            insights.variableLengthSegments > 0) {
            const observed = Math.max(insights.expansionDepth, insights.variableLengthSegments);
            const severity = deriveSeverity(observed, Math.max(this.thresholds.expansionDepth, 1));
            anomalies.push({
                type: 'expensive_traversal',
                severity,
                message: 'Potentially expensive traversal detected (deep or variable length).',
                observed,
                threshold: this.thresholds.expansionDepth,
            });
        }
        for (const anomaly of anomalies) {
            this.anomalyCounter.labels(anomaly.type, anomaly.severity).inc();
        }
        const throttleReason = this.buildThrottleReason(anomalies);
        const throttled = Boolean(throttleReason);
        this.fanOutHistogram.labels(observation.tenantId).observe(insights.fanOut);
        this.expansionHistogram
            .labels(observation.tenantId)
            .observe(insights.expansionDepth);
        this.pathCostHistogram
            .labels(observation.tenantId)
            .observe(insights.expansionDepth + insights.variableLengthSegments * 2);
        this.latencyHistogram
            .labels(observation.tenantId)
            .observe(observation.latencyMs);
        if (throttled) {
            this.throttleCounter.labels(throttleReason).inc();
        }
        if (this.alertSink && anomalies.length > 0) {
            this.alertSink({
                tenantId: observation.tenantId,
                caseId: observation.caseId,
                anomalies,
                cypherPreview: observation.cypher.slice(0, 320),
            });
        }
        return {
            anomalies,
            throttled,
            throttleReason: throttleReason ?? undefined,
            throttleLimit: throttled ? this.thresholds.throttleLimit : undefined,
            insights,
        };
    }
    async metricsSnapshot() {
        return this.registry.metrics();
    }
    buildThrottleReason(anomalies) {
        if (anomalies.some((anomaly) => anomaly.severity === 'high')) {
            return 'severity_high';
        }
        if (anomalies.some((anomaly) => anomaly.type === 'fan_out') &&
            anomalies.length >= 2) {
            return 'stacked_anomalies';
        }
        return null;
    }
    buildInsights(observation) {
        const expansionSteps = observation.plan.filter((step) => step.toLowerCase().includes('expand'));
        const normalizedExpansions = expansionSteps.map((step) => step.replace(/\s+/g, ' ').trim().toLowerCase());
        const uniqueExpansions = new Set(normalizedExpansions);
        const repeatedExpansions = Math.max(normalizedExpansions.length - uniqueExpansions.size, 0);
        const variableLengthSegments = observation.cypher.match(VARIABLE_LENGTH_PATTERN)?.length ?? 0;
        return {
            fanOut: observation.rowsReturned,
            expansionDepth: expansionSteps.length,
            variableLengthSegments,
            repeatedExpansions,
        };
    }
}
exports.IntelGraphQueryMonitor = IntelGraphQueryMonitor;
exports.defaultQueryMonitor = new IntelGraphQueryMonitor();
