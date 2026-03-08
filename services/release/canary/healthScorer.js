"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthScorer = void 0;
exports.summarizeSyntheticFailures = summarizeSyntheticFailures;
exports.withinBakeWindow = withinBakeWindow;
const EPSILON = 1e-9;
function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
}
function normalize(value, baseline, ceiling) {
    if (!Number.isFinite(value) || !Number.isFinite(ceiling)) {
        return 0;
    }
    if (value <= baseline) {
        return 1;
    }
    const allowedHeadroom = Math.max(ceiling - baseline, EPSILON);
    const overage = value - baseline;
    return clamp(1 - overage / allowedHeadroom);
}
function computeProbeScore(successRate, minSuccess) {
    if (!Number.isFinite(successRate)) {
        return 0;
    }
    if (successRate >= minSuccess) {
        return 1;
    }
    const deficit = minSuccess - successRate;
    const range = Math.max(minSuccess, EPSILON);
    return clamp(1 - deficit / range);
}
class HealthScorer {
    weights;
    policy;
    constructor(weights, policy) {
        const totalWeight = weights.errorRate + weights.latency + weights.saturation + weights.probes;
        if (totalWeight <= 0) {
            throw new Error('Component weights must sum to a positive value');
        }
        const normalizedWeights = {
            errorRate: weights.errorRate / totalWeight,
            latency: weights.latency / totalWeight,
            saturation: weights.saturation / totalWeight,
            probes: weights.probes / totalWeight,
        };
        this.weights = normalizedWeights;
        this.policy = policy;
    }
    evaluate(sample) {
        const { metrics, baseline } = sample;
        const errorScore = normalize(metrics.errorRate, baseline.errorRate, this.policy.maxErrorRate);
        const latencyScore = normalize(metrics.latencyP95, baseline.latencyP95, this.policy.maxLatencyP95);
        const saturationScore = normalize(metrics.saturation, baseline.saturation, this.policy.maxSaturation);
        const successRate = this.computeProbeSuccessRate(metrics);
        const probeScore = computeProbeScore(successRate, this.policy.minProbeSuccess);
        const componentScores = {
            errorRate: errorScore,
            latencyP95: latencyScore,
            saturation: saturationScore,
            probes: probeScore,
        };
        const compositeScore = errorScore * this.weights.errorRate +
            latencyScore * this.weights.latency +
            saturationScore * this.weights.saturation +
            probeScore * this.weights.probes;
        const sloBreaches = this.collectBreaches(metrics, successRate);
        return {
            compositeScore,
            componentScores,
            sloBreaches,
        };
    }
    computeProbeSuccessRate(metrics) {
        if (!metrics.probes.length) {
            return 1;
        }
        const successCount = metrics.probes.filter((probe) => probe.success).length;
        return successCount / metrics.probes.length;
    }
    collectBreaches(metrics, probeSuccessRate) {
        const breaches = [];
        if (metrics.errorRate > this.policy.maxErrorRate) {
            breaches.push(`Error rate ${metrics.errorRate.toFixed(4)} exceeds limit ${this.policy.maxErrorRate.toFixed(4)}`);
        }
        if (metrics.latencyP95 > this.policy.maxLatencyP95) {
            breaches.push(`P95 latency ${metrics.latencyP95.toFixed(0)}ms exceeds limit ${this.policy.maxLatencyP95.toFixed(0)}ms`);
        }
        if (metrics.saturation > this.policy.maxSaturation) {
            breaches.push(`Saturation ${(metrics.saturation * 100).toFixed(1)}% exceeds limit ${(this.policy.maxSaturation * 100).toFixed(1)}%`);
        }
        if (probeSuccessRate < this.policy.minProbeSuccess) {
            breaches.push(`Synthetic probe success rate ${(probeSuccessRate * 100).toFixed(1)}% below ${(this.policy.minProbeSuccess * 100).toFixed(1)}%`);
        }
        return breaches;
    }
}
exports.HealthScorer = HealthScorer;
function summarizeSyntheticFailures(sample) {
    return sample.syntheticChecks
        .filter((check) => !check.passed)
        .map((check) => check.name);
}
function withinBakeWindow(startedAt, minBakeSeconds, now) {
    if (!startedAt) {
        return true;
    }
    const elapsed = now.getTime() - new Date(startedAt).getTime();
    return elapsed >= minBakeSeconds * 1000;
}
