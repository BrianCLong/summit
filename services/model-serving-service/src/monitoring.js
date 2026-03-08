"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriftDetector = exports.MetricsCollector = void 0;
function percentile(values, percentileRank) {
    if (values.length === 0)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentileRank / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper)
        return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}
function computeStats(values) {
    if (values.length === 0) {
        return { count: 0, mean: 0, std: 0, min: 0, max: 0 };
    }
    const sum = values.reduce((acc, value) => acc + value, 0);
    const mean = sum / values.length;
    const variance = values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / Math.max(values.length - 1, 1);
    const std = Math.sqrt(variance);
    return { count: values.length, mean, std, min: Math.min(...values), max: Math.max(...values) };
}
function extractNumericFeatures(input) {
    const values = [];
    const traverse = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            values.push(value);
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(traverse);
            return;
        }
        if (value && typeof value === 'object') {
            Object.values(value).forEach(traverse);
        }
    };
    traverse(input);
    return values;
}
class MetricsCollector {
    totalRequests = 0;
    totalErrors = 0;
    latencies = [];
    throughputWindow = [];
    recordSuccess(latencyMs, batchSize) {
        this.totalRequests += batchSize;
        this.latencies.push(latencyMs);
        this.latencies = this.latencies.slice(-500);
        this.throughputWindow.push(Date.now());
        this.throughputWindow = this.throughputWindow.filter((ts) => ts > Date.now() - 60_000);
    }
    recordFailure() {
        this.totalRequests += 1;
        this.totalErrors += 1;
        this.throughputWindow.push(Date.now());
        this.throughputWindow = this.throughputWindow.filter((ts) => ts > Date.now() - 60_000);
    }
    snapshot() {
        const errorRate = this.totalRequests === 0 ? 0 : this.totalErrors / this.totalRequests;
        const averageLatency = this.latencies.length === 0
            ? 0
            : this.latencies.reduce((acc, value) => acc + value, 0) / this.latencies.length;
        return {
            requests: this.totalRequests,
            errors: this.totalErrors,
            errorRate,
            p50Latency: percentile(this.latencies, 50),
            p95Latency: percentile(this.latencies, 95),
            p99Latency: percentile(this.latencies, 99),
            averageLatency,
            throughputPerMinute: this.throughputWindow.length,
            lastUpdated: new Date().toISOString(),
        };
    }
}
exports.MetricsCollector = MetricsCollector;
class DriftDetector {
    baseline;
    recentSignals = [];
    evaluate(request) {
        const numericFeatures = extractNumericFeatures(request.inputs);
        const stats = computeStats(numericFeatures);
        if (!this.baseline && stats.count > 0) {
            this.baseline = stats;
            const baselineSignal = {
                status: 'baseline',
                psi: 0,
                baselineSize: stats.count,
                featureCount: stats.count,
                lastSeenAt: new Date().toISOString(),
            };
            this.recentSignals.push(baselineSignal);
            this.recentSignals = this.recentSignals.slice(-50);
            return baselineSignal;
        }
        if (!this.baseline) {
            const emptySignal = {
                status: 'baseline',
                psi: 0,
                baselineSize: 0,
                featureCount: 0,
                lastSeenAt: new Date().toISOString(),
            };
            this.recentSignals.push(emptySignal);
            this.recentSignals = this.recentSignals.slice(-50);
            return emptySignal;
        }
        const psi = this.populationStabilityIndex(this.baseline, stats);
        const status = psi > 0.3 ? 'drift' : psi > 0.15 ? 'warning' : 'stable';
        const signal = {
            status,
            psi,
            baselineSize: this.baseline.count,
            featureCount: stats.count,
            lastSeenAt: new Date().toISOString(),
        };
        this.recentSignals.push(signal);
        this.recentSignals = this.recentSignals.slice(-50);
        return signal;
    }
    summary() {
        return this.recentSignals[this.recentSignals.length - 1];
    }
    populationStabilityIndex(baseline, current) {
        if (baseline.count === 0 || current.count === 0)
            return 0;
        const meanShift = Math.abs(current.mean - baseline.mean) / Math.max(baseline.std || 1, 1);
        const varianceShift = Math.abs(current.std - baseline.std) / Math.max(baseline.std || 1, 1);
        const coverageShift = Math.abs(current.max - baseline.max) + Math.abs(current.min - baseline.min);
        return meanShift * 0.6 + varianceShift * 0.3 + (coverageShift > 0 ? 0.1 : 0);
    }
}
exports.DriftDetector = DriftDetector;
