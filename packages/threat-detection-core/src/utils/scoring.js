"use strict";
/**
 * Threat scoring utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateThreatScore = calculateThreatScore;
exports.scoreToSeverity = scoreToSeverity;
exports.calculatePriorityScore = calculatePriorityScore;
exports.calculateConfidenceScore = calculateConfidenceScore;
exports.calculateRiskScore = calculateRiskScore;
exports.normalizeScore = normalizeScore;
exports.calculateZScore = calculateZScore;
exports.zScoreToAnomalyScore = zScoreToAnomalyScore;
exports.calculateIQRScore = calculateIQRScore;
exports.ensembleAnomalyScore = ensembleAnomalyScore;
exports.calculateScoreDecay = calculateScoreDecay;
exports.adjustScoreForFalsePositives = adjustScoreForFalsePositives;
const events_js_1 = require("../types/events.js");
/**
 * Calculate normalized threat score (0-1) from multiple factors
 */
function calculateThreatScore(factors) {
    const weights = {
        anomalyScore: 0.25,
        confidenceScore: 0.20,
        impactScore: 0.25,
        frequencyScore: 0.10,
        severityScore: 0.15,
        threatIntelScore: 0.05
    };
    let score = 0;
    let totalWeight = 0;
    for (const [key, weight] of Object.entries(weights)) {
        const value = factors[key];
        if (value !== undefined && value !== null) {
            score += value * weight;
            totalWeight += weight;
        }
    }
    return totalWeight > 0 ? Math.min(1, Math.max(0, score / totalWeight)) : 0;
}
/**
 * Convert threat score to severity level
 */
function scoreToSeverity(score) {
    if (score >= 0.9)
        return events_js_1.ThreatSeverity.CRITICAL;
    if (score >= 0.7)
        return events_js_1.ThreatSeverity.HIGH;
    if (score >= 0.5)
        return events_js_1.ThreatSeverity.MEDIUM;
    if (score >= 0.3)
        return events_js_1.ThreatSeverity.LOW;
    return events_js_1.ThreatSeverity.INFO;
}
/**
 * Calculate priority score for alerting (combines severity and impact)
 */
function calculatePriorityScore(severity, affectedEntities, businessImpact = 'medium') {
    const severityScores = {
        [events_js_1.ThreatSeverity.CRITICAL]: 1.0,
        [events_js_1.ThreatSeverity.HIGH]: 0.75,
        [events_js_1.ThreatSeverity.MEDIUM]: 0.5,
        [events_js_1.ThreatSeverity.LOW]: 0.25,
        [events_js_1.ThreatSeverity.INFO]: 0.1
    };
    const impactScores = {
        low: 0.25,
        medium: 0.5,
        high: 0.75,
        critical: 1.0
    };
    const severityScore = severityScores[severity] || 0;
    const impactScore = impactScores[businessImpact] || 0.5;
    const volumeScore = Math.min(1, Math.log10(affectedEntities + 1) / 3);
    return (severityScore * 0.5) + (impactScore * 0.3) + (volumeScore * 0.2);
}
/**
 * Calculate confidence score based on multiple indicators
 */
function calculateConfidenceScore(indicators) {
    let confidence = 0;
    let factors = 0;
    if (indicators.signatureMatch) {
        confidence += 0.9;
        factors++;
    }
    if (indicators.behavioralAnomaly !== undefined) {
        confidence += indicators.behavioralAnomaly;
        factors++;
    }
    if (indicators.threatIntelMatch) {
        confidence += 0.85;
        factors++;
    }
    if (indicators.mlPrediction !== undefined) {
        confidence += indicators.mlPrediction;
        factors++;
    }
    if (indicators.manualValidation) {
        confidence += 1.0;
        factors++;
    }
    return factors > 0 ? confidence / factors : 0;
}
/**
 * Calculate risk score (probability × impact)
 */
function calculateRiskScore(probabilityScore, impactScore) {
    return probabilityScore * impactScore;
}
/**
 * Normalize score to 0-1 range using min-max normalization
 */
function normalizeScore(score, min, max) {
    if (max === min)
        return 0.5;
    return Math.max(0, Math.min(1, (score - min) / (max - min)));
}
/**
 * Calculate z-score for statistical anomaly detection
 */
function calculateZScore(value, mean, stdDev) {
    if (stdDev === 0)
        return 0;
    return (value - mean) / stdDev;
}
/**
 * Calculate anomaly score from z-score
 */
function zScoreToAnomalyScore(zScore) {
    const absZScore = Math.abs(zScore);
    // Map z-score to 0-1 range (z-score > 3 is highly anomalous)
    return Math.min(1, absZScore / 3);
}
/**
 * Calculate IQR-based anomaly score
 */
function calculateIQRScore(value, q1, q3) {
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    if (value >= lowerBound && value <= upperBound) {
        return 0; // Not an outlier
    }
    // Calculate how far outside the bounds
    const distance = value < lowerBound
        ? lowerBound - value
        : value - upperBound;
    return Math.min(1, distance / iqr);
}
/**
 * Combine multiple anomaly scores using ensemble method
 */
function ensembleAnomalyScore(scores, method = 'mean', weights) {
    if (scores.length === 0)
        return 0;
    switch (method) {
        case 'max':
            return Math.max(...scores);
        case 'mean':
            return scores.reduce((sum, score) => sum + score, 0) / scores.length;
        case 'median':
            const sorted = [...scores].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0
                ? (sorted[mid - 1] + sorted[mid]) / 2
                : sorted[mid];
        case 'weighted':
            if (!weights || weights.length !== scores.length) {
                return scores.reduce((sum, score) => sum + score, 0) / scores.length;
            }
            const totalWeight = weights.reduce((sum, w) => sum + w, 0);
            const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0);
            return weightedSum / totalWeight;
        default:
            return 0;
    }
}
/**
 * Calculate threat score decay over time
 */
function calculateScoreDecay(initialScore, elapsedTime, // milliseconds
halfLife = 3600000 // 1 hour default
) {
    return initialScore * Math.pow(0.5, elapsedTime / halfLife);
}
/**
 * Adjust score based on false positive history
 */
function adjustScoreForFalsePositives(score, falsePositiveRate) {
    // Reduce confidence based on historical false positive rate
    const adjustment = 1 - (falsePositiveRate * 0.5);
    return score * Math.max(0.1, adjustment);
}
