"use strict";
/**
 * Utility functions for risk scoring and calculations
 * @module @intelgraph/geopolitical-analysis/utils/scoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreToRiskLevel = scoreToRiskLevel;
exports.weightedAverage = weightedAverage;
exports.normalize = normalize;
exports.calculateConfidence = calculateConfidence;
exports.exponentialDecay = exponentialDecay;
exports.movingAverage = movingAverage;
exports.rateOfChange = rateOfChange;
exports.zScore = zScore;
exports.percentileRank = percentileRank;
exports.calculateCAGR = calculateCAGR;
exports.detectTrend = detectTrend;
const index_js_1 = require("../types/index.js");
/**
 * Convert a numeric score (0-100) to a RiskLevel
 */
function scoreToRiskLevel(score) {
    if (score < 0 || score > 100) {
        throw new Error(`Score must be between 0 and 100, got ${score}`);
    }
    if (score >= 76)
        return index_js_1.RiskLevel.CRITICAL;
    if (score >= 51)
        return index_js_1.RiskLevel.HIGH;
    if (score >= 26)
        return index_js_1.RiskLevel.MODERATE;
    return index_js_1.RiskLevel.LOW;
}
/**
 * Calculate weighted average of multiple scores
 */
function weightedAverage(scores) {
    if (scores.length === 0) {
        throw new Error('Cannot calculate weighted average of empty array');
    }
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight === 0) {
        throw new Error('Total weight cannot be zero');
    }
    const weightedSum = scores.reduce((sum, s) => sum + s.value * s.weight, 0);
    return weightedSum / totalWeight;
}
/**
 * Normalize a value to 0-100 scale
 */
function normalize(value, min, max, inverse = false) {
    if (min >= max) {
        throw new Error(`min (${min}) must be less than max (${max})`);
    }
    const clamped = Math.max(min, Math.min(max, value));
    const normalized = ((clamped - min) / (max - min)) * 100;
    return inverse ? 100 - normalized : normalized;
}
/**
 * Calculate confidence level based on data quality metrics
 */
function calculateConfidence(metrics) {
    const { dataRecency, sourceReliability, dataCompleteness, expertConsensus } = metrics;
    // Penalize old data
    const recencyScore = normalize(dataRecency, 0, 365, true);
    // Calculate overall confidence
    const confidenceScore = weightedAverage([
        { value: recencyScore, weight: 0.2 },
        { value: sourceReliability, weight: 0.3 },
        { value: dataCompleteness, weight: 0.25 },
        { value: expertConsensus, weight: 0.25 },
    ]);
    if (confidenceScore >= 85)
        return index_js_1.ConfidenceLevel.VERY_HIGH;
    if (confidenceScore >= 70)
        return index_js_1.ConfidenceLevel.HIGH;
    if (confidenceScore >= 50)
        return index_js_1.ConfidenceLevel.MEDIUM;
    return index_js_1.ConfidenceLevel.LOW;
}
/**
 * Apply exponential decay to a time series value
 */
function exponentialDecay(initialValue, halfLife, timeElapsed) {
    return initialValue * Math.pow(0.5, timeElapsed / halfLife);
}
/**
 * Calculate moving average
 */
function movingAverage(values, window) {
    if (window > values.length) {
        throw new Error('Window size cannot be larger than array length');
    }
    const result = [];
    for (let i = 0; i <= values.length - window; i++) {
        const windowValues = values.slice(i, i + window);
        const avg = windowValues.reduce((sum, v) => sum + v, 0) / window;
        result.push(avg);
    }
    return result;
}
/**
 * Calculate rate of change (percentage)
 */
function rateOfChange(current, previous) {
    if (previous === 0) {
        return current === 0 ? 0 : Infinity;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
}
/**
 * Z-score normalization
 */
function zScore(value, mean, stdDev) {
    if (stdDev === 0) {
        throw new Error('Standard deviation cannot be zero');
    }
    return (value - mean) / stdDev;
}
/**
 * Calculate percentile rank
 */
function percentileRank(value, dataset) {
    if (dataset.length === 0) {
        throw new Error('Dataset cannot be empty');
    }
    const sorted = [...dataset].sort((a, b) => a - b);
    const index = sorted.findIndex((v) => v >= value);
    if (index === -1) {
        return 100;
    }
    return (index / sorted.length) * 100;
}
/**
 * Calculate compound annual growth rate (CAGR)
 */
function calculateCAGR(beginValue, endValue, years) {
    if (beginValue <= 0 || endValue <= 0) {
        throw new Error('Values must be positive for CAGR calculation');
    }
    if (years <= 0) {
        throw new Error('Years must be positive');
    }
    return (Math.pow(endValue / beginValue, 1 / years) - 1) * 100;
}
/**
 * Detect trend direction
 */
function detectTrend(values) {
    if (values.length < 2) {
        return 'STABLE';
    }
    // Simple linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    // Threshold for determining significance
    const avgValue = sumY / n;
    const significanceThreshold = avgValue * 0.01; // 1% of average
    if (Math.abs(slope) < significanceThreshold) {
        return 'STABLE';
    }
    return slope > 0 ? 'RISING' : 'DECLINING';
}
