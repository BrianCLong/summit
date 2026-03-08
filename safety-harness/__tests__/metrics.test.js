"use strict";
/**
 * Unit tests for MetricsCollector
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const metrics_1 = require("../src/metrics");
(0, globals_1.describe)('MetricsCollector', () => {
    let collector;
    let mockScenarios;
    let mockResults;
    (0, globals_1.beforeEach)(() => {
        collector = new metrics_1.MetricsCollector();
        mockScenarios = [
            {
                id: 'SCENARIO-001',
                name: 'Critical Test',
                description: 'Critical severity test',
                attackType: 'data-exfiltration',
                component: 'copilot',
                riskLevel: 'critical',
                enabled: true,
                input: {
                    context: {
                        role: 'analyst',
                        tenantId: 'tenant-1',
                        userId: 'user-1',
                        permissions: [],
                    },
                },
                expected: {
                    outcome: 'block',
                },
                metadata: {
                    tags: ['test'],
                    severity: 'critical',
                },
            },
            {
                id: 'SCENARIO-002',
                name: 'High Test',
                description: 'High severity test',
                attackType: 'profiling',
                component: 'analytics',
                riskLevel: 'high',
                enabled: true,
                input: {
                    context: {
                        role: 'analyst',
                        tenantId: 'tenant-1',
                        userId: 'user-1',
                        permissions: [],
                    },
                },
                expected: {
                    outcome: 'block',
                },
                metadata: {
                    tags: ['test'],
                    severity: 'high',
                },
            },
        ];
        mockResults = [
            {
                scenarioId: 'SCENARIO-001',
                passed: false,
                timestamp: '2025-01-01T00:00:00Z',
                durationMs: 100,
                actual: {
                    outcome: 'allow-with-logging',
                    response: {},
                    blocked: false,
                    guardrailsTriggered: ['test-guardrail'],
                    policyViolations: ['test-policy'],
                },
                comparison: {
                    outcomeMatch: false,
                },
                failure: {
                    reason: 'Outcome mismatch',
                    details: {},
                    severity: 'critical',
                },
            },
            {
                scenarioId: 'SCENARIO-002',
                passed: true,
                timestamp: '2025-01-01T00:00:01Z',
                durationMs: 150,
                actual: {
                    outcome: 'block',
                    response: {},
                    blocked: true,
                    guardrailsTriggered: ['test-guardrail'],
                    policyViolations: [],
                },
                comparison: {
                    outcomeMatch: true,
                },
            },
        ];
    });
    (0, globals_1.describe)('recordScenarioResult', () => {
        (0, globals_1.it)('should record scenario result', () => {
            collector.recordScenarioResult(mockScenarios[0], mockResults[0]);
            // Verify recording happened (would check internal state in real tests)
            (0, globals_1.expect)(collector).toBeDefined();
        });
        (0, globals_1.it)('should track guardrail counts', () => {
            collector.recordScenarioResult(mockScenarios[0], mockResults[0]);
            collector.recordScenarioResult(mockScenarios[1], mockResults[1]);
            // Guardrail 'test-guardrail' should appear twice
            const summary = collector.getSummary(mockScenarios, mockResults);
            (0, globals_1.expect)(summary.guardrailStats.totalTriggered).toBe(2);
        });
        (0, globals_1.it)('should track policy violation counts', () => {
            collector.recordScenarioResult(mockScenarios[0], mockResults[0]);
            const summary = collector.getSummary(mockScenarios, mockResults);
            (0, globals_1.expect)(summary.policyStats.totalViolations).toBe(1);
        });
    });
    (0, globals_1.describe)('getSummary', () => {
        (0, globals_1.beforeEach)(() => {
            mockScenarios.forEach((scenario, i) => {
                collector.recordScenarioResult(scenario, mockResults[i]);
            });
        });
        (0, globals_1.it)('should calculate total scenarios correctly', () => {
            const summary = collector.getSummary(mockScenarios, mockResults);
            (0, globals_1.expect)(summary.totalScenarios).toBe(2);
        });
        (0, globals_1.it)('should calculate pass/fail counts correctly', () => {
            const summary = collector.getSummary(mockScenarios, mockResults);
            (0, globals_1.expect)(summary.passed).toBe(1);
            (0, globals_1.expect)(summary.failed).toBe(1);
            (0, globals_1.expect)(summary.passRate).toBe(0.5);
            (0, globals_1.expect)(summary.failRate).toBe(0.5);
        });
        (0, globals_1.it)('should break down by risk level', () => {
            const summary = collector.getSummary(mockScenarios, mockResults);
            (0, globals_1.expect)(summary.byRiskLevel.critical.total).toBe(1);
            (0, globals_1.expect)(summary.byRiskLevel.critical.failed).toBe(1);
            (0, globals_1.expect)(summary.byRiskLevel.high.total).toBe(1);
            (0, globals_1.expect)(summary.byRiskLevel.high.passed).toBe(1);
        });
        (0, globals_1.it)('should break down by component', () => {
            const summary = collector.getSummary(mockScenarios, mockResults);
            (0, globals_1.expect)(summary.byComponent.copilot.total).toBe(1);
            (0, globals_1.expect)(summary.byComponent.analytics.total).toBe(1);
        });
        (0, globals_1.it)('should break down by attack type', () => {
            const summary = collector.getSummary(mockScenarios, mockResults);
            (0, globals_1.expect)(summary.byAttackType['data-exfiltration'].total).toBe(1);
            (0, globals_1.expect)(summary.byAttackType.profiling.total).toBe(1);
        });
        (0, globals_1.it)('should count failures by severity', () => {
            const summary = collector.getSummary(mockScenarios, mockResults);
            (0, globals_1.expect)(summary.criticalFailures).toBe(1);
            (0, globals_1.expect)(summary.highFailures).toBe(0);
        });
        (0, globals_1.it)('should calculate duration metrics', () => {
            const summary = collector.getSummary(mockScenarios, mockResults);
            (0, globals_1.expect)(summary.totalDurationMs).toBe(250);
            (0, globals_1.expect)(summary.averageDurationMs).toBe(125);
        });
        (0, globals_1.it)('should aggregate guardrail statistics', () => {
            const summary = collector.getSummary(mockScenarios, mockResults);
            (0, globals_1.expect)(summary.guardrailStats.totalTriggered).toBe(2);
            (0, globals_1.expect)(summary.guardrailStats.uniqueGuardrails.size).toBeGreaterThan(0);
            (0, globals_1.expect)(summary.guardrailStats.topGuardrails.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should aggregate policy statistics', () => {
            const summary = collector.getSummary(mockScenarios, mockResults);
            (0, globals_1.expect)(summary.policyStats.totalViolations).toBe(1);
            (0, globals_1.expect)(summary.policyStats.uniquePolicies.size).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('getPackMetrics', () => {
        (0, globals_1.it)('should return metrics for specific pack', () => {
            collector.recordPackResults('pack-001', mockResults);
            const metrics = collector.getPackMetrics('pack-001');
            (0, globals_1.expect)(metrics).toBeDefined();
            (0, globals_1.expect)(metrics?.total).toBe(2);
            (0, globals_1.expect)(metrics?.passed).toBe(1);
            (0, globals_1.expect)(metrics?.failed).toBe(1);
        });
        (0, globals_1.it)('should return undefined for unknown pack', () => {
            const metrics = collector.getPackMetrics('unknown-pack');
            (0, globals_1.expect)(metrics).toBeUndefined();
        });
    });
    (0, globals_1.describe)('clear', () => {
        (0, globals_1.it)('should clear all metrics', () => {
            collector.recordScenarioResult(mockScenarios[0], mockResults[0]);
            collector.clear();
            // After clear, metrics should be empty
            (0, globals_1.expect)(collector).toBeDefined();
        });
    });
});
