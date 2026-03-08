"use strict";
/**
 * Trust & Confidence Scoring Types
 *
 * Type definitions for the trust scoring system.
 * All types conform to the Trust Model.
 *
 * @module agents/trust/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_DECAY_CONFIG = exports.DEFAULT_MODEL_TRUST_WEIGHTS = exports.DEFAULT_AGENT_TRUST_WEIGHTS = exports.DEFAULT_COMPONENT_WEIGHTS = void 0;
exports.getTrustScoreBand = getTrustScoreBand;
exports.calculateStandardDeviation = calculateStandardDeviation;
exports.DEFAULT_COMPONENT_WEIGHTS = {
    historicalAccuracy: 0.4,
    constraintCompliance: 0.3,
    auditOutcomes: 0.2,
    consistency: 0.1,
};
exports.DEFAULT_AGENT_TRUST_WEIGHTS = {
    ...exports.DEFAULT_COMPONENT_WEIGHTS,
    historicalAccuracy: 0.32, // Reduced to make room for agent-specific
    constraintCompliance: 0.24,
    auditOutcomes: 0.16,
    consistency: 0.08,
    capabilityAdherence: 0.1,
    negotiationBehavior: 0.05,
    resourceDiscipline: 0.05,
};
exports.DEFAULT_MODEL_TRUST_WEIGHTS = {
    ...exports.DEFAULT_COMPONENT_WEIGHTS,
    historicalAccuracy: 0.28, // Reduced to make room for model-specific
    constraintCompliance: 0.21,
    auditOutcomes: 0.14,
    consistency: 0.07,
    calibration: 0.15,
    biasMetrics: 0.1,
    explainabilityQuality: 0.05,
};
exports.DEFAULT_DECAY_CONFIG = {
    enabled: true,
    intervals: [
        { daysSinceActivity: 7, decayFactor: 1.0 },
        { daysSinceActivity: 30, decayFactor: 0.95 },
        { daysSinceActivity: 90, decayFactor: 0.85 },
        { daysSinceActivity: 180, decayFactor: 0.7 },
        { daysSinceActivity: 365, decayFactor: 0.5 }, // Revert to neutral
    ],
};
// ============================================================================
// Utility Functions
// ============================================================================
function getTrustScoreBand(score) {
    if (score >= 0.9)
        return 'very_high';
    if (score >= 0.7)
        return 'high';
    if (score >= 0.5)
        return 'medium';
    if (score >= 0.3)
        return 'low';
    return 'very_low';
}
function calculateStandardDeviation(values) {
    if (values.length === 0)
        return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
}
