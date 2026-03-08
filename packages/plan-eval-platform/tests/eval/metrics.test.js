"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const metrics_js_1 = require("../../src/eval/metrics.js");
const createMockResult = (success, tokens, costUsd) => ({
    scenarioId: `scenario-${Math.random().toString(36).slice(2)}`,
    runId: `run-${Math.random().toString(36).slice(2)}`,
    success,
    metrics: {
        taskSuccessRate: success ? 1 : 0,
        taskCompletionTime: Math.random() * 1000,
        totalTokens: tokens,
        inputTokens: tokens * 0.6,
        outputTokens: tokens * 0.4,
        totalCostUsd: costUsd,
        costPerSuccessfulTask: success ? costUsd : 0,
        p50LatencyMs: 100,
        p95LatencyMs: 200,
        p99LatencyMs: 300,
        avgLatencyMs: 150,
        toolCallCount: 3,
        toolSuccessRate: success ? 1 : 0.5,
        avgToolLatencyMs: 50,
        safetyViolationCount: success ? 0 : 1,
        safetyViolationRate: success ? 0 : 1,
        jailbreakAttempts: 0,
        jailbreakSuccesses: 0,
        routingDecisionCount: 2,
        routingAccuracy: 0.8,
        costSavingsVsBaseline: 0.1,
    },
    trace: {
        id: 'trace-1',
        scenarioId: 'scenario',
        runId: 'run',
        startTime: new Date().toISOString(),
        events: [],
    },
    errors: [],
    assertions: [],
});
(0, vitest_1.describe)('MetricsCollector', () => {
    let collector;
    (0, vitest_1.beforeEach)(() => {
        collector = new metrics_js_1.MetricsCollector();
    });
    (0, vitest_1.it)('should compute metrics from empty results', () => {
        const metrics = collector.computeMetrics();
        (0, vitest_1.expect)(metrics.taskSuccessRate).toBe(0);
        (0, vitest_1.expect)(metrics.totalTokens).toBe(0);
        (0, vitest_1.expect)(metrics.totalCostUsd).toBe(0);
    });
    (0, vitest_1.it)('should add results and compute metrics', () => {
        collector.addResult(createMockResult(true, 1000, 0.01));
        collector.addResult(createMockResult(true, 800, 0.008));
        collector.addResult(createMockResult(false, 1200, 0.012));
        const metrics = collector.computeMetrics();
        (0, vitest_1.expect)(metrics.taskSuccessRate).toBeCloseTo(2 / 3, 2);
        (0, vitest_1.expect)(metrics.totalTokens).toBe(3000);
        (0, vitest_1.expect)(metrics.totalCostUsd).toBeCloseTo(0.03, 4);
    });
    (0, vitest_1.it)('should calculate cost per successful task', () => {
        collector.addResult(createMockResult(true, 1000, 0.01));
        collector.addResult(createMockResult(true, 1000, 0.02));
        collector.addResult(createMockResult(false, 1000, 0.015));
        const metrics = collector.computeMetrics();
        // Total cost = 0.045, 2 successes
        (0, vitest_1.expect)(metrics.costPerSuccessfulTask).toBeCloseTo(0.0225, 4);
    });
    (0, vitest_1.it)('should calculate latency percentiles', () => {
        // Add results with varying latencies
        for (let i = 0; i < 10; i++) {
            const result = createMockResult(true, 100, 0.001);
            result.metrics.avgLatencyMs = (i + 1) * 100; // 100, 200, ..., 1000
            collector.addResult(result);
        }
        const metrics = collector.computeMetrics();
        (0, vitest_1.expect)(metrics.p50LatencyMs).toBe(500);
        (0, vitest_1.expect)(metrics.p95LatencyMs).toBe(1000);
    });
    (0, vitest_1.it)('should compute metrics by category', () => {
        const result1 = createMockResult(true, 1000, 0.01);
        result1.trace.metadata = { category: 'code_correction' };
        const result2 = createMockResult(false, 800, 0.008);
        result2.trace.metadata = { category: 'data_analysis' };
        const result3 = createMockResult(true, 1200, 0.012);
        result3.trace.metadata = { category: 'code_correction' };
        collector.addResults([result1, result2, result3]);
        const byCategory = collector.computeByCategory();
        (0, vitest_1.expect)(byCategory.has('code_correction')).toBe(true);
        (0, vitest_1.expect)(byCategory.has('data_analysis')).toBe(true);
        const codeMetrics = byCategory.get('code_correction');
        (0, vitest_1.expect)(codeMetrics.taskSuccessRate).toBe(1);
        const dataMetrics = byCategory.get('data_analysis');
        (0, vitest_1.expect)(dataMetrics.taskSuccessRate).toBe(0);
    });
    (0, vitest_1.it)('should compare to baseline', () => {
        collector.addResult(createMockResult(true, 800, 0.008));
        collector.addResult(createMockResult(true, 900, 0.009));
        const baseline = collector.computeMetrics();
        baseline.taskSuccessRate = 0.8;
        baseline.totalCostUsd = 0.02;
        // Improve results
        collector.clear();
        collector.addResult(createMockResult(true, 700, 0.007));
        collector.addResult(createMockResult(true, 750, 0.0075));
        const comparison = collector.compareToBaseline(baseline);
        (0, vitest_1.expect)(comparison.deltas).toBeDefined();
        (0, vitest_1.expect)(comparison.improvements.length + comparison.regressions.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should generate summary report', () => {
        collector.addResult(createMockResult(true, 1000, 0.01));
        collector.addResult(createMockResult(true, 800, 0.008));
        const summary = collector.generateSummary();
        (0, vitest_1.expect)(summary).toContain('Evaluation Summary');
        (0, vitest_1.expect)(summary).toContain('Success Rate');
        (0, vitest_1.expect)(summary).toContain('Cost Metrics');
        (0, vitest_1.expect)(summary).toContain('Latency Metrics');
    });
    (0, vitest_1.it)('should clear results', () => {
        collector.addResult(createMockResult(true, 1000, 0.01));
        collector.clear();
        const metrics = collector.computeMetrics();
        (0, vitest_1.expect)(metrics.totalTokens).toBe(0);
    });
});
(0, vitest_1.describe)('calculateMetricsFromTraces', () => {
    (0, vitest_1.it)('should calculate metrics from trace array', () => {
        const traces = [
            {
                id: 'trace-1',
                scenarioId: 'scenario-1',
                runId: 'run-1',
                startTime: '2024-01-01T00:00:00Z',
                endTime: '2024-01-01T00:00:01Z',
                events: [],
                summary: {
                    success: true,
                    totalDurationMs: 1000,
                    totalTokens: 500,
                    totalCostUsd: 0.005,
                    toolCallCount: 2,
                    errorCount: 0,
                    safetyViolations: 0,
                },
            },
            {
                id: 'trace-2',
                scenarioId: 'scenario-2',
                runId: 'run-2',
                startTime: '2024-01-01T00:00:00Z',
                endTime: '2024-01-01T00:00:02Z',
                events: [],
                summary: {
                    success: false,
                    totalDurationMs: 2000,
                    totalTokens: 800,
                    totalCostUsd: 0.008,
                    toolCallCount: 3,
                    errorCount: 1,
                    safetyViolations: 0,
                },
            },
        ];
        const metrics = (0, metrics_js_1.calculateMetricsFromTraces)(traces);
        (0, vitest_1.expect)(metrics.taskSuccessRate).toBe(0.5);
        (0, vitest_1.expect)(metrics.totalTokens).toBe(1300);
        (0, vitest_1.expect)(metrics.totalCostUsd).toBeCloseTo(0.013, 4);
    });
});
