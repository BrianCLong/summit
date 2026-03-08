"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredibilityEngine = void 0;
class CredibilityEngine {
    /**
     * Calculates a stability-weighted credibility score.
     * Stability measures how consistent the source is under challenge or over time.
     */
    static calculateStabilityWeighted(baseScore, corrections, challenges, totalClaims) {
        if (totalClaims === 0)
            return baseScore;
        const errorRate = corrections / totalClaims;
        const challengeRate = challenges / totalClaims;
        // Stability penalty increases with higher error rate and challenge rate
        const stabilityPenalty = (errorRate * 0.6) + (challengeRate * 0.4);
        const weight = Math.max(0.1, 1 - stabilityPenalty);
        return baseScore * weight;
    }
    /**
     * Applies a claim aging curve (monotonic decay).
     */
    static applyAging(score, ageDays, halfLifeDays = 30) {
        // Standard exponential decay: score * (0.5 ^ (age / halfLife))
        return score * Math.pow(0.5, ageDays / halfLifeDays);
    }
}
exports.CredibilityEngine = CredibilityEngine;
