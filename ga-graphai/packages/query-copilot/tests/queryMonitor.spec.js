"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prom_client_1 = require("prom-client");
const queryMonitor_js_1 = require("../src/queryMonitor.js");
const sandbox_js_1 = require("../src/sandbox.js");
const SAMPLE_PLAN = [
    'NodeByLabelScan(Person)',
    'Expand(EMPLOYED_BY -> Organization)',
    'Expand(EMPLOYED_BY -> Organization)',
];
const SAMPLE_CYPHER = 'MATCH (p:Person)-[:EMPLOYED_BY*1..5]->(o:Organization) RETURN p, o';
(0, vitest_1.describe)('IntelGraphQueryMonitor', () => {
    (0, vitest_1.test)('flags high fan-out, alerts, and exposes histograms', async () => {
        const alerts = [];
        const monitor = new queryMonitor_js_1.IntelGraphQueryMonitor({
            thresholds: { fanOut: 5, repetition: 1, expansionDepth: 2, throttleLimit: 3 },
            registry: new prom_client_1.Registry(),
            alertSink: (payload) => alerts.push(payload),
        });
        const result = monitor.observe({
            cypher: SAMPLE_CYPHER,
            plan: SAMPLE_PLAN,
            rowsReturned: 22,
            latencyMs: 180,
            tenantId: 'tenant-a',
        });
        (0, vitest_1.expect)(result.throttled).toBe(true);
        (0, vitest_1.expect)(result.throttleLimit).toBe(3);
        (0, vitest_1.expect)(result.anomalies.map((item) => item.type)).toContain('fan_out');
        (0, vitest_1.expect)(alerts).toHaveLength(1);
        const metrics = await monitor.metricsSnapshot();
        (0, vitest_1.expect)(metrics).toContain('intelgraph_query_fanout');
        (0, vitest_1.expect)(metrics).toContain('intelgraph_query_throttles_total');
    });
});
(0, vitest_1.describe)('sandboxExecute monitoring integration', () => {
    (0, vitest_1.test)('applies throttle when patterns look abusive', () => {
        const monitor = new queryMonitor_js_1.IntelGraphQueryMonitor({
            thresholds: { fanOut: 2, repetition: 1, expansionDepth: 1, throttleLimit: 1 },
            registry: new prom_client_1.Registry(),
        });
        const dataset = {
            nodes: Array.from({ length: 5 }).map((_, index) => ({
                id: `person-${index}`,
                label: 'Person',
                properties: { name: `User ${index}` },
            })),
            relationships: [],
        };
        const result = (0, sandbox_js_1.sandboxExecute)({
            cypher: 'MATCH (p:Person) RETURN p',
            tenantId: 'tenant-abuse',
            policy: { authorityId: 'case-1', purpose: 'investigation' },
            dataset,
        }, monitor);
        (0, vitest_1.expect)(result.monitoring.throttled).toBe(true);
        (0, vitest_1.expect)(result.rows.length).toBe(1);
        (0, vitest_1.expect)(result.truncated).toBe(true);
        (0, vitest_1.expect)(result.monitoring.anomalies.length).toBeGreaterThan(0);
    });
});
