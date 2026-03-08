"use strict";
/**
 * Predictive Execution Engine Types
 *
 * Type definitions for the governed predictive analytics engine.
 * All types conform to the Predictive Model Contract.
 *
 * @module analytics/engine/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictionError = void 0;
exports.calculateConfidence = calculateConfidence;
exports.getConfidenceBand = getConfidenceBand;
exports.applyConfidenceDecay = applyConfidenceDecay;
// ============================================================================
// Error Types
// ============================================================================
class PredictionError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'PredictionError';
    }
}
exports.PredictionError = PredictionError;
function calculateConfidence(factors) {
    const weights = {
        dataQuality: 0.3,
        dataFreshness: 0.2,
        modelAccuracy: 0.3,
        inputCompleteness: 0.15,
        assumptionValidity: 0.05,
    };
    let totalConfidence = factors.dataQuality * weights.dataQuality +
        factors.dataFreshness * weights.dataFreshness +
        factors.modelAccuracy * weights.modelAccuracy +
        factors.inputCompleteness * weights.inputCompleteness;
    if (factors.assumptionValidity !== undefined) {
        totalConfidence += factors.assumptionValidity * weights.assumptionValidity;
    }
    return Math.max(0, Math.min(1, totalConfidence));
}
function getConfidenceBand(confidence) {
    if (confidence >= 0.9)
        return 'very_high';
    if (confidence >= 0.7)
        return 'high';
    if (confidence >= 0.4)
        return 'medium';
    return 'low';
}
// ============================================================================
// Confidence Decay
// ============================================================================
function applyConfidenceDecay(originalConfidence, predictionTimestamp) {
    const predictionTime = new Date(predictionTimestamp).getTime();
    const now = Date.now();
    const ageMs = now - predictionTime;
    const day = 24 * 60 * 60 * 1000;
    const ageDays = ageMs / day;
    let decayFactor = 1.0;
    if (ageDays > 30) {
        decayFactor = 0.5;
    }
    else if (ageDays > 7) {
        decayFactor = 0.8;
    }
    else if (ageDays > 1) {
        decayFactor = 0.95;
    }
    return originalConfidence * decayFactor;
}
