"use strict";
/**
 * Trust Score Model
 * Manages trust scoring and history for intelligence sources
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustScoreFactory = void 0;
exports.getTrustLevel = getTrustLevel;
exports.shouldIncludeSource = shouldIncludeSource;
const DEFAULT_CONFIG = {
    decayRate: 0.01,
    accuracyWeight: 0.5,
    consistencyWeight: 0.3,
    timelinessWeight: 0.2,
    minScore: 0.0,
    maxScore: 1.0,
};
class TrustScoreFactory {
    static create(sourceId, initialScore = 0.5) {
        return {
            sourceId,
            overallScore: initialScore,
            accuracyScore: initialScore,
            consistencyScore: initialScore,
            timelinessScore: initialScore,
            history: [
                {
                    timestamp: new Date(),
                    event: 'INITIALIZED',
                    impact: 0,
                    reason: 'Source registered',
                },
            ],
            lastUpdated: new Date(),
        };
    }
    static calculateOverall(score, config = DEFAULT_CONFIG) {
        const weighted = score.accuracyScore * config.accuracyWeight +
            score.consistencyScore * config.consistencyWeight +
            score.timelinessScore * config.timelinessWeight;
        return Math.max(config.minScore, Math.min(config.maxScore, weighted));
    }
    static recordAccuratePrediction(score, predictionId) {
        const impact = 0.05;
        const newAccuracy = Math.min(1, score.accuracyScore + impact);
        return {
            ...score,
            accuracyScore: newAccuracy,
            overallScore: TrustScoreFactory.calculateOverall({
                ...score,
                accuracyScore: newAccuracy,
            }),
            history: [
                ...score.history,
                {
                    timestamp: new Date(),
                    event: 'ACCURATE_PREDICTION',
                    impact,
                    reason: `Prediction ${predictionId} verified as accurate`,
                },
            ],
            lastUpdated: new Date(),
        };
    }
    static recordInaccuratePrediction(score, predictionId, severity = 1) {
        const impact = -0.1 * severity;
        const newAccuracy = Math.max(0, score.accuracyScore + impact);
        return {
            ...score,
            accuracyScore: newAccuracy,
            overallScore: TrustScoreFactory.calculateOverall({
                ...score,
                accuracyScore: newAccuracy,
            }),
            history: [
                ...score.history,
                {
                    timestamp: new Date(),
                    event: 'INACCURATE_PREDICTION',
                    impact,
                    reason: `Prediction ${predictionId} was inaccurate (severity: ${severity})`,
                },
            ],
            lastUpdated: new Date(),
        };
    }
    static recordConsistencyEvent(score, isConsistent) {
        const impact = isConsistent ? 0.02 : -0.05;
        const newConsistency = Math.max(0, Math.min(1, score.consistencyScore + impact));
        return {
            ...score,
            consistencyScore: newConsistency,
            overallScore: TrustScoreFactory.calculateOverall({
                ...score,
                consistencyScore: newConsistency,
            }),
            history: [
                ...score.history,
                {
                    timestamp: new Date(),
                    event: isConsistent ? 'CONSISTENT_SIGNAL' : 'INCONSISTENT_SIGNAL',
                    impact,
                },
            ],
            lastUpdated: new Date(),
        };
    }
    static recordTimeliness(score, responseTimeMs, expectedTimeMs) {
        const ratio = responseTimeMs / expectedTimeMs;
        let impact;
        if (ratio <= 1) {
            impact = 0.02; // On time or early
        }
        else if (ratio <= 2) {
            impact = -0.02; // Slightly late
        }
        else {
            impact = -0.1; // Very late
        }
        const newTimeliness = Math.max(0, Math.min(1, score.timelinessScore + impact));
        return {
            ...score,
            timelinessScore: newTimeliness,
            overallScore: TrustScoreFactory.calculateOverall({
                ...score,
                timelinessScore: newTimeliness,
            }),
            history: [
                ...score.history,
                {
                    timestamp: new Date(),
                    event: 'TIMELINESS_RECORDED',
                    impact,
                    reason: `Response: ${responseTimeMs}ms, Expected: ${expectedTimeMs}ms`,
                },
            ],
            lastUpdated: new Date(),
        };
    }
    static applyDecay(score, daysSinceLastActivity, config = DEFAULT_CONFIG) {
        const decayFactor = Math.pow(1 - config.decayRate, daysSinceLastActivity);
        return {
            ...score,
            accuracyScore: score.accuracyScore * decayFactor,
            consistencyScore: score.consistencyScore * decayFactor,
            timelinessScore: score.timelinessScore * decayFactor,
            overallScore: TrustScoreFactory.calculateOverall(score, config) * decayFactor,
            history: [
                ...score.history,
                {
                    timestamp: new Date(),
                    event: 'DECAY_APPLIED',
                    impact: -(1 - decayFactor),
                    reason: `${daysSinceLastActivity} days of inactivity`,
                },
            ],
            lastUpdated: new Date(),
        };
    }
    static manualAdjustment(score, adjustment, reason) {
        const newOverall = Math.max(0, Math.min(1, score.overallScore + adjustment));
        return {
            ...score,
            overallScore: newOverall,
            history: [
                ...score.history,
                {
                    timestamp: new Date(),
                    event: 'MANUAL_ADJUSTMENT',
                    impact: adjustment,
                    reason,
                },
            ],
            lastUpdated: new Date(),
        };
    }
}
exports.TrustScoreFactory = TrustScoreFactory;
function getTrustLevel(score) {
    if (score.overallScore >= 0.9)
        return 'HIGHLY_TRUSTED';
    if (score.overallScore >= 0.7)
        return 'TRUSTED';
    if (score.overallScore >= 0.5)
        return 'NEUTRAL';
    if (score.overallScore >= 0.3)
        return 'LOW_TRUST';
    return 'UNTRUSTED';
}
function shouldIncludeSource(score, minTrust = 0.3) {
    return score.overallScore >= minTrust;
}
