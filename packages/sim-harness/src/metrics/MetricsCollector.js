"use strict";
/**
 * Metrics Collector - Aggregates and analyzes session metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
const uuid_1 = require("uuid");
class MetricsCollector {
    sessions = [];
    scenario;
    /**
     * Add session to collector
     */
    addSession(session) {
        this.sessions.push(session);
    }
    /**
     * Set scenario for context
     */
    setScenario(scenario) {
        this.scenario = scenario;
    }
    /**
     * Generate evaluation report
     */
    async generateReport(options = {}) {
        const aggregateMetrics = this.computeAggregateMetrics();
        const report = {
            id: `report-${(0, uuid_1.v4)()}`,
            timestamp: new Date().toISOString(),
            scenarioId: this.scenario?.id || 'unknown',
            scenarioName: this.scenario?.name || 'unknown',
            sessions: this.sessions,
            aggregateMetrics,
        };
        // Add comparison if baseline provided
        if (options.baseline && options.baselineVersion && options.candidateVersion) {
            report.comparison = this.computeComparison(options.baseline, aggregateMetrics, options.baselineVersion, options.candidateVersion);
        }
        return report;
    }
    /**
     * Compute aggregate metrics across all sessions
     */
    computeAggregateMetrics() {
        if (this.sessions.length === 0) {
            throw new Error('No sessions to aggregate');
        }
        const completedSessions = this.sessions.filter((s) => s.status === 'completed');
        const failedSessions = this.sessions.filter((s) => s.status === 'failed');
        const timeoutSessions = this.sessions.filter((s) => s.status === 'timeout');
        // Performance metrics
        const durations = this.sessions.map((s) => s.metrics.totalDuration);
        const avgDuration = this.mean(durations);
        const allLatencySamples = this.sessions.flatMap((s) => s.metrics.queryLatency.samples);
        const avgQueryLatency = this.computeLatencyMetrics(allLatencySamples);
        const insightTimes = this.sessions
            .map((s) => s.metrics.timeToFirstInsight)
            .filter((t) => t !== undefined);
        const avgTimeToInsight = insightTimes.length > 0 ? this.mean(insightTimes) : 0;
        // Correctness metrics
        const totalEntitiesFound = this.sum(this.sessions.map((s) => s.metrics.entitiesFound));
        const totalRelationshipsFound = this.sum(this.sessions.map((s) => s.metrics.relationshipsFound));
        const expectedEntities = this.scenario?.expectedOutcomes.minEntitiesFound || 1;
        const expectedRelationships = this.scenario?.expectedOutcomes.minRelationshipsFound || 1;
        const entitiesFoundRate = totalEntitiesFound / (expectedEntities * this.sessions.length);
        const relationshipsFoundRate = totalRelationshipsFound / (expectedRelationships * this.sessions.length);
        // Calculate false positives/negatives (simplified)
        const falsePositiveRate = 0; // Would need ground truth data
        const falseNegativeRate = Math.max(0, 1 - entitiesFoundRate);
        // Reliability metrics
        const successRate = completedSessions.length / this.sessions.length;
        const errorRate = failedSessions.length / this.sessions.length;
        const timeoutRate = timeoutSessions.length / this.sessions.length;
        return {
            performance: {
                avgDuration,
                avgQueryLatency,
                avgTimeToInsight,
            },
            correctness: {
                entitiesFoundRate,
                relationshipsFoundRate,
                falsePositiveRate,
                falseNegativeRate,
            },
            reliability: {
                successRate,
                errorRate,
                timeoutRate,
            },
        };
    }
    /**
     * Compute comparison between baseline and candidate
     */
    computeComparison(baseline, candidate, baselineVersion, candidateVersion) {
        return {
            baseline: {
                version: baselineVersion,
                metrics: baseline,
            },
            candidate: {
                version: candidateVersion,
                metrics: candidate,
            },
            deltas: {
                performance: {
                    avgDuration: this.percentChange(baseline.performance.avgDuration, candidate.performance.avgDuration),
                    avgQueryLatency_p50: this.percentChange(baseline.performance.avgQueryLatency.p50, candidate.performance.avgQueryLatency.p50),
                    avgQueryLatency_p95: this.percentChange(baseline.performance.avgQueryLatency.p95, candidate.performance.avgQueryLatency.p95),
                    avgTimeToInsight: this.percentChange(baseline.performance.avgTimeToInsight, candidate.performance.avgTimeToInsight),
                },
                correctness: {
                    entitiesFoundRate: this.percentChange(baseline.correctness.entitiesFoundRate, candidate.correctness.entitiesFoundRate),
                    relationshipsFoundRate: this.percentChange(baseline.correctness.relationshipsFoundRate, candidate.correctness.relationshipsFoundRate),
                    falsePositiveRate: this.percentChange(baseline.correctness.falsePositiveRate, candidate.correctness.falsePositiveRate),
                    falseNegativeRate: this.percentChange(baseline.correctness.falseNegativeRate, candidate.correctness.falseNegativeRate),
                },
                reliability: {
                    successRate: this.percentChange(baseline.reliability.successRate, candidate.reliability.successRate),
                    errorRate: this.percentChange(baseline.reliability.errorRate, candidate.reliability.errorRate),
                    timeoutRate: this.percentChange(baseline.reliability.timeoutRate, candidate.reliability.timeoutRate),
                },
            },
        };
    }
    /**
     * Compute latency metrics from samples
     */
    computeLatencyMetrics(samples) {
        if (samples.length === 0) {
            return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0, samples: [] };
        }
        const sorted = [...samples].sort((a, b) => a - b);
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean: this.mean(samples),
            p50: this.percentile(sorted, 50),
            p95: this.percentile(sorted, 95),
            p99: this.percentile(sorted, 99),
            samples: sorted,
        };
    }
    /**
     * Calculate percentile
     */
    percentile(sorted, p) {
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }
    /**
     * Calculate mean
     */
    mean(values) {
        if (values.length === 0)
            return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    /**
     * Calculate sum
     */
    sum(values) {
        return values.reduce((a, b) => a + b, 0);
    }
    /**
     * Calculate percent change
     */
    percentChange(baseline, candidate) {
        if (baseline === 0)
            return 0;
        return ((candidate - baseline) / baseline) * 100;
    }
    /**
     * Clear all sessions
     */
    clear() {
        this.sessions = [];
        this.scenario = undefined;
    }
}
exports.MetricsCollector = MetricsCollector;
