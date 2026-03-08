"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.benchmarkPatterns = exports.runPatternBenchmark = void 0;
// @ts-nocheck
const node_perf_hooks_1 = require("node:perf_hooks");
const computePercentile = (samples, percentile) => {
    if (samples.length === 0) {
        return 0;
    }
    const sorted = [...samples].sort((a, b) => a - b);
    const position = (percentile / 100) * (sorted.length - 1);
    const lowerIndex = Math.floor(position);
    const upperIndex = Math.ceil(position);
    if (lowerIndex === upperIndex) {
        return sorted[lowerIndex];
    }
    const weight = position - lowerIndex;
    return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
};
const ensureIterations = (value) => {
    const iterations = value ?? 10;
    if (!Number.isFinite(iterations) || iterations <= 0) {
        throw new Error('Benchmark iterations must be greater than zero.');
    }
    return Math.floor(iterations);
};
/**
 * Measures execution characteristics of a pattern within an {@link EventBooster} instance.
 */
const runPatternBenchmark = (booster, patternName, events, config = {}) => {
    const iterations = ensureIterations(config.iterations);
    const warmupIterations = Math.max(0, Math.floor(config.warmupIterations ?? Math.min(2, iterations)));
    const now = config.now ?? (() => node_perf_hooks_1.performance.now());
    const options = config.patternOptions ?? {};
    for (let i = 0; i < warmupIterations; i += 1) {
        booster.boost(events, patternName, options);
    }
    const durations = [];
    for (let i = 0; i < iterations; i += 1) {
        const start = now();
        const result = booster.boost(events, patternName, options);
        const end = now();
        durations.push(Math.max(0, end - start));
        // Ensure we do not keep references to large arrays unnecessarily.
        result.events.length = 0;
    }
    const total = durations.reduce((sum, value) => sum + value, 0);
    const averageMs = durations.length > 0 ? total / durations.length : 0;
    const minMs = durations.length > 0 ? Math.min(...durations) : 0;
    const maxMs = durations.length > 0 ? Math.max(...durations) : 0;
    const p95Ms = computePercentile(durations, 95);
    const throughputPerSecond = averageMs > 0 ? (events.length * 1000) / averageMs : 0;
    return {
        patternName,
        iterations,
        sampleSize: events.length,
        averageMs,
        minMs,
        maxMs,
        p95Ms,
        throughputPerSecond,
    };
};
exports.runPatternBenchmark = runPatternBenchmark;
/**
 * Runs {@link runPatternBenchmark} across several patterns for comparative analysis.
 */
const benchmarkPatterns = (booster, events, patternNames, config = {}) => {
    return patternNames.map((patternName) => (0, exports.runPatternBenchmark)(booster, patternName, events, config));
};
exports.benchmarkPatterns = benchmarkPatterns;
