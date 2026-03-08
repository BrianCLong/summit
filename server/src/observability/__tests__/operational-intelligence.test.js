"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fabric_js_1 = require("../operational-intelligence/fabric.js");
const root_cause_js_1 = require("../operational-intelligence/root-cause.js");
const predictive_js_1 = require("../operational-intelligence/predictive.js");
const failure_simulator_js_1 = require("../operational-intelligence/failure-simulator.js");
const now = Date.now();
let idCounter = 0;
const nextId = (prefix) => {
    const id = `${prefix}-${idCounter}`;
    idCounter += 1;
    return id;
};
function buildMetric(partial = {}) {
    return {
        id: nextId('metric'),
        kind: 'metric',
        name: 'latency_ms',
        value: 120,
        service: 'search-api',
        timestamp: now,
        expected: { p95: 100 },
        ...partial,
    };
}
function buildLog(service, severity, correlationId) {
    return {
        id: nextId('log'),
        kind: 'log',
        message: `${service} message`,
        service,
        severity,
        timestamp: now,
        correlationId,
    };
}
function buildTrace(service, durationMs, correlationId, traceId) {
    return {
        id: nextId('trace'),
        kind: 'trace',
        spanId: 'span-1',
        traceId: traceId ?? correlationId,
        service,
        durationMs,
        operation: 'op',
        timestamp: now,
        correlationId,
    };
}
(0, globals_1.describe)('ObservabilityFabric', () => {
    (0, globals_1.it)('correlates signals and computes health snapshot', () => {
        const fabric = new fabric_js_1.ObservabilityFabric();
        fabric.ingest(buildLog('search-api', 'error', 'corr-1'));
        fabric.ingest(buildTrace('search-api', 550, 'corr-1'));
        fabric.ingest(buildMetric({ service: 'search-api', value: 200, correlationId: 'corr-1' }));
        const groups = fabric.getCorrelatedGroups();
        (0, globals_1.expect)(groups).toHaveLength(1);
        (0, globals_1.expect)(groups[0].services.has('search-api')).toBe(true);
        const health = fabric.getHealthSnapshot();
        (0, globals_1.expect)(health.errorRate).toBeGreaterThan(0);
        (0, globals_1.expect)(health.serviceHealth['search-api'].latencyP95).toBeGreaterThan(0);
    });
});
(0, globals_1.describe)('RootCauseAnalyzer', () => {
    (0, globals_1.it)('identifies probable service using correlated signals and dependencies', () => {
        const fabric = new fabric_js_1.ObservabilityFabric();
        fabric.ingest(buildLog('edge-proxy', 'error', 'corr-2'));
        fabric.ingest(buildTrace('edge-proxy', 800, 'corr-2'));
        fabric.ingest(buildMetric({ service: 'edge-proxy', correlationId: 'corr-2', value: 300 }));
        fabric.ingest(buildLog('search-api', 'error', 'corr-2'));
        fabric.ingest(buildTrace('search-api', 150, 'corr-2'));
        const dependencies = [
            { from: 'edge-proxy', to: 'search-api', criticality: 0.8 },
        ];
        const analyzer = new root_cause_js_1.RootCauseAnalyzer(dependencies);
        const insights = analyzer.analyze(fabric.getCorrelatedGroups());
        (0, globals_1.expect)(insights[0].probableService).toBe('edge-proxy');
        (0, globals_1.expect)(insights[0].confidence).toBeGreaterThan(0);
        (0, globals_1.expect)(insights[0].impactedServices).toContain('search-api');
    });
});
(0, globals_1.describe)('AnomalyPredictor', () => {
    (0, globals_1.it)('raises anomaly when value deviates from EMA baseline', () => {
        const predictor = new predictive_js_1.AnomalyPredictor(0.5, 0.5);
        const baseline = buildMetric({ value: 10, timestamp: now - 1000, correlationId: 'corr-3' });
        const moderate = buildMetric({ value: 12, timestamp: now - 500, correlationId: 'corr-3' });
        const spike = buildMetric({ value: 40, timestamp: now, correlationId: 'corr-3' });
        predictor.ingest(baseline);
        predictor.ingest(moderate);
        const prediction = predictor.ingest(spike);
        (0, globals_1.expect)(prediction.isLikelyAnomaly).toBe(true);
        (0, globals_1.expect)(prediction.probability).toBeGreaterThan(0.5);
    });
});
(0, globals_1.describe)('FailureSimulator', () => {
    (0, globals_1.it)('evaluates drill steps against correlated signals', () => {
        const fabric = new fabric_js_1.ObservabilityFabric();
        const correlationId = 'corr-4';
        fabric.ingest(buildLog('dr-db', 'error', correlationId));
        fabric.ingest(buildTrace('dr-db', 900, correlationId));
        const scenario = {
            id: 'drill-1',
            name: 'DB failover runbook',
            owner: 'oncall',
            blastRadius: 'service',
            expectedRecoveryMinutes: 15,
            steps: [
                {
                    description: 'Detect degraded DB latency',
                    expectedSignals: [
                        { service: 'dr-db', kind: 'trace' },
                        { service: 'dr-db', kind: 'log', severity: 'error' },
                    ],
                    successCriteria: 'latency observed and error surfaced',
                },
            ],
        };
        const simulator = new failure_simulator_js_1.FailureSimulator(fabric);
        const result = simulator.simulate(scenario);
        (0, globals_1.expect)(result.completed).toBe(true);
        (0, globals_1.expect)(result.outcomes[0].matchedSignals).toHaveLength(2);
        (0, globals_1.expect)(result.recoveryEtaMinutes).toBe(15);
    });
});
