"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
exports.calculateMetricsFromTraces = calculateMetricsFromTraces;
/**
 * MetricsCollector - Aggregate and compute evaluation metrics
 */
class MetricsCollector {
    results = [];
    /**
     * Add a scenario result
     */
    addResult(result) {
        this.results.push(result);
    }
    /**
     * Add multiple results
     */
    addResults(results) {
        this.results.push(...results);
    }
    /**
     * Clear all results
     */
    clear() {
        this.results = [];
    }
    /**
     * Compute aggregate metrics
     */
    computeMetrics() {
        if (this.results.length === 0) {
            return this.emptyMetrics();
        }
        const successCount = this.results.filter((r) => r.success).length;
        const metrics = this.results.map((r) => r.metrics);
        // Aggregate token metrics
        const totalTokens = this.sum(metrics, 'totalTokens');
        const inputTokens = this.sum(metrics, 'inputTokens');
        const outputTokens = this.sum(metrics, 'outputTokens');
        const totalCostUsd = this.sum(metrics, 'totalCostUsd');
        // Calculate latency percentiles
        const latencies = metrics.map((m) => m.avgLatencyMs).sort((a, b) => a - b);
        const p50 = this.percentile(latencies, 0.5);
        const p95 = this.percentile(latencies, 0.95);
        const p99 = this.percentile(latencies, 0.99);
        const avgLatency = this.average(latencies);
        // Tool metrics
        const toolCallCount = this.sum(metrics, 'toolCallCount');
        const toolSuccessRate = this.average(metrics.map((m) => m.toolSuccessRate));
        const avgToolLatency = this.average(metrics.map((m) => m.avgToolLatencyMs));
        // Safety metrics
        const safetyViolationCount = this.sum(metrics, 'safetyViolationCount');
        const jailbreakAttempts = this.sum(metrics, 'jailbreakAttempts');
        const jailbreakSuccesses = this.sum(metrics, 'jailbreakSuccesses');
        // Routing metrics
        const routingDecisionCount = this.sum(metrics, 'routingDecisionCount');
        return {
            taskSuccessRate: successCount / this.results.length,
            taskCompletionTime: this.sum(metrics, 'taskCompletionTime'),
            totalTokens,
            inputTokens,
            outputTokens,
            totalCostUsd,
            costPerSuccessfulTask: successCount > 0 ? totalCostUsd / successCount : 0,
            p50LatencyMs: p50,
            p95LatencyMs: p95,
            p99LatencyMs: p99,
            avgLatencyMs: avgLatency,
            toolCallCount,
            toolSuccessRate,
            avgToolLatencyMs: avgToolLatency,
            safetyViolationCount,
            safetyViolationRate: this.results.length > 0
                ? safetyViolationCount / this.results.length
                : 0,
            jailbreakAttempts,
            jailbreakSuccesses,
            routingDecisionCount,
            routingAccuracy: this.average(metrics.map((m) => m.routingAccuracy)),
            costSavingsVsBaseline: this.average(metrics.map((m) => m.costSavingsVsBaseline)),
        };
    }
    /**
     * Compute metrics grouped by scenario category
     */
    computeByCategory() {
        const byCategory = new Map();
        for (const result of this.results) {
            const category = result.trace.metadata?.category ?? 'unknown';
            if (!byCategory.has(category)) {
                byCategory.set(category, []);
            }
            byCategory.get(category).push(result);
        }
        const metricsByCategory = new Map();
        for (const [category, results] of byCategory) {
            const collector = new MetricsCollector();
            collector.addResults(results);
            metricsByCategory.set(category, collector.computeMetrics());
        }
        return metricsByCategory;
    }
    /**
     * Compare metrics against a baseline
     */
    compareToBaseline(baseline) {
        const current = this.computeMetrics();
        const deltas = {};
        const improvements = [];
        const regressions = [];
        // Metrics where higher is better
        const higherIsBetter = [
            'taskSuccessRate',
            'toolSuccessRate',
            'routingAccuracy',
            'costSavingsVsBaseline',
        ];
        // Metrics where lower is better
        const lowerIsBetter = [
            'totalCostUsd',
            'costPerSuccessfulTask',
            'p50LatencyMs',
            'p95LatencyMs',
            'p99LatencyMs',
            'avgLatencyMs',
            'safetyViolationCount',
            'safetyViolationRate',
            'jailbreakSuccesses',
        ];
        for (const key of higherIsBetter) {
            const k = key;
            const delta = current[k] - baseline[k];
            deltas[k] = delta;
            if (delta > 0) {
                improvements.push(`${key}: +${(delta * 100).toFixed(1)}%`);
            }
            else if (delta < 0) {
                regressions.push(`${key}: ${(delta * 100).toFixed(1)}%`);
            }
        }
        for (const key of lowerIsBetter) {
            const k = key;
            const delta = current[k] - baseline[k];
            deltas[k] = delta;
            if (delta < 0) {
                improvements.push(`${key}: ${delta.toFixed(2)} (improved)`);
            }
            else if (delta > 0) {
                regressions.push(`${key}: +${delta.toFixed(2)} (worse)`);
            }
        }
        return { deltas, improvements, regressions };
    }
    /**
     * Generate a summary report
     */
    generateSummary() {
        const metrics = this.computeMetrics();
        const lines = [
            '=== Evaluation Summary ===',
            '',
            `Total Scenarios: ${this.results.length}`,
            `Success Rate: ${(metrics.taskSuccessRate * 100).toFixed(1)}%`,
            '',
            '--- Cost Metrics ---',
            `Total Tokens: ${metrics.totalTokens.toLocaleString()}`,
            `Total Cost: $${metrics.totalCostUsd.toFixed(4)}`,
            `Cost per Success: $${metrics.costPerSuccessfulTask.toFixed(4)}`,
            '',
            '--- Latency Metrics ---',
            `P50: ${metrics.p50LatencyMs.toFixed(0)}ms`,
            `P95: ${metrics.p95LatencyMs.toFixed(0)}ms`,
            `P99: ${metrics.p99LatencyMs.toFixed(0)}ms`,
            `Avg: ${metrics.avgLatencyMs.toFixed(0)}ms`,
            '',
            '--- Tool Metrics ---',
            `Tool Calls: ${metrics.toolCallCount}`,
            `Tool Success Rate: ${(metrics.toolSuccessRate * 100).toFixed(1)}%`,
            `Avg Tool Latency: ${metrics.avgToolLatencyMs.toFixed(0)}ms`,
            '',
            '--- Safety Metrics ---',
            `Safety Violations: ${metrics.safetyViolationCount}`,
            `Jailbreak Attempts: ${metrics.jailbreakAttempts}`,
            `Jailbreak Successes: ${metrics.jailbreakSuccesses}`,
            '',
            '--- Routing Metrics ---',
            `Routing Decisions: ${metrics.routingDecisionCount}`,
            `Routing Accuracy: ${(metrics.routingAccuracy * 100).toFixed(1)}%`,
            `Cost Savings vs Baseline: ${(metrics.costSavingsVsBaseline * 100).toFixed(1)}%`,
        ];
        return lines.join('\n');
    }
    /**
     * Helper: sum a metric across all results
     */
    sum(metrics, key) {
        return metrics.reduce((sum, m) => sum + m[key], 0);
    }
    /**
     * Helper: average a numeric array
     */
    average(arr) {
        return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    }
    /**
     * Helper: calculate percentile
     */
    percentile(sortedArr, p) {
        if (sortedArr.length === 0)
            return 0;
        const idx = Math.floor(sortedArr.length * p);
        return sortedArr[Math.min(idx, sortedArr.length - 1)];
    }
    /**
     * Helper: return empty metrics
     */
    emptyMetrics() {
        return {
            taskSuccessRate: 0,
            taskCompletionTime: 0,
            totalTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalCostUsd: 0,
            costPerSuccessfulTask: 0,
            p50LatencyMs: 0,
            p95LatencyMs: 0,
            p99LatencyMs: 0,
            avgLatencyMs: 0,
            toolCallCount: 0,
            toolSuccessRate: 0,
            avgToolLatencyMs: 0,
            safetyViolationCount: 0,
            safetyViolationRate: 0,
            jailbreakAttempts: 0,
            jailbreakSuccesses: 0,
            routingDecisionCount: 0,
            routingAccuracy: 0,
            costSavingsVsBaseline: 0,
        };
    }
}
exports.MetricsCollector = MetricsCollector;
/**
 * Calculate aggregate metrics from traces directly
 */
function calculateMetricsFromTraces(traces) {
    const collector = new MetricsCollector();
    for (const trace of traces) {
        const summary = trace.summary ?? {
            success: false,
            totalDurationMs: 0,
            totalTokens: 0,
            totalCostUsd: 0,
            toolCallCount: 0,
            errorCount: 0,
            safetyViolations: 0,
        };
        collector.addResult({
            scenarioId: trace.scenarioId,
            runId: trace.runId,
            success: summary.success,
            metrics: {
                taskSuccessRate: summary.success ? 1 : 0,
                taskCompletionTime: summary.totalDurationMs,
                totalTokens: summary.totalTokens,
                inputTokens: 0,
                outputTokens: 0,
                totalCostUsd: summary.totalCostUsd,
                costPerSuccessfulTask: summary.success ? summary.totalCostUsd : 0,
                p50LatencyMs: summary.totalDurationMs,
                p95LatencyMs: summary.totalDurationMs,
                p99LatencyMs: summary.totalDurationMs,
                avgLatencyMs: summary.totalDurationMs,
                toolCallCount: summary.toolCallCount,
                toolSuccessRate: summary.errorCount === 0 ? 1 : 0,
                avgToolLatencyMs: summary.toolCallCount > 0
                    ? summary.totalDurationMs / summary.toolCallCount
                    : 0,
                safetyViolationCount: summary.safetyViolations,
                safetyViolationRate: summary.safetyViolations > 0 ? 1 : 0,
                jailbreakAttempts: 0,
                jailbreakSuccesses: 0,
                routingDecisionCount: trace.events.filter((e) => e.type === 'routing_decision').length,
                routingAccuracy: 1,
                costSavingsVsBaseline: 0,
            },
            trace,
            errors: [],
            assertions: [],
        });
    }
    return collector.computeMetrics();
}
