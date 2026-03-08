"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const neo4jPerformanceMonitor_js_1 = require("../neo4jPerformanceMonitor.js");
const neo4jMetrics_js_1 = require("../../metrics/neo4jMetrics.js");
(0, globals_1.describe)('Neo4jPerformanceMonitor', () => {
    const metricSum = (values) => values.reduce((sum, entry) => sum + Number(entry.value), 0);
    (0, globals_1.beforeEach)(() => {
        neo4jPerformanceMonitor_js_1.neo4jPerformanceMonitor.reset();
    });
    (0, globals_1.it)('tracks slow queries and records latency metrics', () => {
        const customMonitor = new neo4jPerformanceMonitor_js_1.Neo4jPerformanceMonitor({
            slowQueryThresholdMs: 100,
            maxTrackedQueries: 5,
        });
        const observeSpy = globals_1.jest.spyOn(neo4jMetrics_js_1.neo4jQueryLatencyMs, 'observe');
        customMonitor.recordSuccess({
            cypher: 'MATCH (n:Person) RETURN n',
            params: { limit: 10 },
            durationMs: 150,
            labels: { operation: 'read', label: 'Person' },
        });
        const latencyValues = neo4jMetrics_js_1.neo4jQueryLatencyMs.get().values;
        const totalValues = neo4jMetrics_js_1.neo4jQueryTotal.get().values;
        (0, globals_1.expect)(observeSpy).toHaveBeenCalledWith(150);
        (0, globals_1.expect)(latencyValues[0].value).toBeGreaterThanOrEqual(0);
        (0, globals_1.expect)(metricSum(totalValues)).toBe(1);
        (0, globals_1.expect)(customMonitor.getSlowQueries()).toHaveLength(1);
        observeSpy.mockRestore();
    });
    (0, globals_1.it)('records errors with labels', () => {
        neo4jPerformanceMonitor_js_1.neo4jPerformanceMonitor.recordError({
            cypher: 'CREATE (n:Alert {id: $id})',
            params: { id: '123' },
            durationMs: 25,
            labels: { operation: 'write', label: 'Alert' },
            error: 'Write failed',
        });
        const errorValues = neo4jMetrics_js_1.neo4jQueryErrorsTotal.get().values;
        (0, globals_1.expect)(metricSum(errorValues)).toBe(1);
        (0, globals_1.expect)(neo4jPerformanceMonitor_js_1.neo4jPerformanceMonitor.getRecentErrors()).toHaveLength(1);
    });
});
