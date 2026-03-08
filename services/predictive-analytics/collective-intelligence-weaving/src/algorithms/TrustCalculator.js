"use strict";
/**
 * Trust Calculator Algorithm
 * Calculates and updates trust scores for intelligence sources
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustCalculator = void 0;
exports.createTrustCalculator = createTrustCalculator;
const TrustScore_js_1 = require("../models/TrustScore.js");
class TrustCalculator {
    config;
    verificationHistory = new Map();
    signalHistory = new Map();
    constructor(config) {
        this.config = {
            accuracyWeight: 0.5,
            consistencyWeight: 0.3,
            timelinessWeight: 0.2,
            decayRate: 0.01,
            verificationWindow: 24,
            minSignalsForReliability: 5,
            ...config,
        };
    }
    recordSignal(signal) {
        const history = this.signalHistory.get(signal.sourceId) || [];
        this.signalHistory.set(signal.sourceId, [...history, signal]);
    }
    verifyPrediction(sourceId, signalId, actualValue, wasAccurate, accuracy = wasAccurate ? 1 : 0) {
        const verifications = this.verificationHistory.get(sourceId) || [];
        this.verificationHistory.set(sourceId, [
            ...verifications,
            {
                signalId,
                wasAccurate,
                actualValue,
                verifiedAt: new Date(),
                accuracy,
            },
        ]);
    }
    calculateTrustScore(sourceId, existingScore) {
        const verifications = this.verificationHistory.get(sourceId) || [];
        const signals = this.signalHistory.get(sourceId) || [];
        let score = existingScore || TrustScore_js_1.TrustScoreFactory.create(sourceId);
        // Calculate accuracy score
        if (verifications.length >= this.config.minSignalsForReliability) {
            const accuracySum = verifications.reduce((sum, v) => sum + v.accuracy, 0);
            score = {
                ...score,
                accuracyScore: accuracySum / verifications.length,
            };
        }
        // Calculate consistency score
        score = {
            ...score,
            consistencyScore: this.calculateConsistency(signals),
        };
        // Calculate timeliness score
        score = {
            ...score,
            timelinessScore: this.calculateTimeliness(signals),
        };
        // Calculate overall score
        score = {
            ...score,
            overallScore: this.calculateOverallScore(score),
            lastUpdated: new Date(),
        };
        return score;
    }
    calculateConsistency(signals) {
        if (signals.length < 2)
            return 0.5;
        // Group signals by domain
        const domainSignals = new Map();
        for (const signal of signals) {
            const existing = domainSignals.get(signal.domain) || [];
            domainSignals.set(signal.domain, [...existing, signal]);
        }
        let totalConsistency = 0;
        let domainCount = 0;
        for (const [_domain, dSignals] of domainSignals) {
            if (dSignals.length < 2)
                continue;
            // Check prediction consistency within domain
            let consistentPairs = 0;
            let totalPairs = 0;
            for (let i = 0; i < dSignals.length - 1; i++) {
                for (let j = i + 1; j < dSignals.length; j++) {
                    totalPairs++;
                    if (JSON.stringify(dSignals[i].prediction) ===
                        JSON.stringify(dSignals[j].prediction)) {
                        consistentPairs++;
                    }
                }
            }
            totalConsistency += totalPairs > 0 ? consistentPairs / totalPairs : 0.5;
            domainCount++;
        }
        return domainCount > 0 ? totalConsistency / domainCount : 0.5;
    }
    calculateTimeliness(signals) {
        if (signals.length === 0)
            return 0.5;
        const now = Date.now();
        let timelinessSum = 0;
        for (const signal of signals) {
            // Signals that arrive before their horizon expires are timely
            const remainingHorizon = signal.timestamp.getTime() +
                signal.horizon * 3600000 -
                now;
            if (remainingHorizon > 0) {
                // Signal is still valid
                const totalHorizon = signal.horizon * 3600000;
                const validRatio = remainingHorizon / totalHorizon;
                timelinessSum += Math.min(1, validRatio + 0.5);
            }
            else {
                // Signal has expired
                timelinessSum += 0.3;
            }
        }
        return timelinessSum / signals.length;
    }
    calculateOverallScore(score) {
        return (score.accuracyScore * this.config.accuracyWeight +
            score.consistencyScore * this.config.consistencyWeight +
            score.timelinessScore * this.config.timelinessWeight);
    }
    applyDecay(score, daysSinceActivity) {
        const decayFactor = Math.pow(1 - this.config.decayRate, daysSinceActivity);
        const newHistory = [
            ...score.history,
            {
                timestamp: new Date(),
                event: 'DECAY_APPLIED',
                impact: -(1 - decayFactor) * score.overallScore,
                reason: `${daysSinceActivity} days inactive`,
            },
        ];
        return {
            ...score,
            accuracyScore: score.accuracyScore * decayFactor,
            consistencyScore: score.consistencyScore * decayFactor,
            timelinessScore: score.timelinessScore * decayFactor,
            overallScore: score.overallScore * decayFactor,
            history: newHistory,
            lastUpdated: new Date(),
        };
    }
    getSourceRanking(scores) {
        const sorted = [...scores].sort((a, b) => b.overallScore - a.overallScore);
        return sorted.map((score, index) => ({
            sourceId: score.sourceId,
            rank: index + 1,
            score: score.overallScore,
        }));
    }
    identifyUnreliableSources(scores, threshold = 0.3) {
        return scores.filter((s) => s.overallScore < threshold);
    }
    calculateSourceAgreement(sourceId1, sourceId2) {
        const signals1 = this.signalHistory.get(sourceId1) || [];
        const signals2 = this.signalHistory.get(sourceId2) || [];
        // Find overlapping domains
        const domains1 = new Set(signals1.map((s) => s.domain));
        const domains2 = new Set(signals2.map((s) => s.domain));
        const commonDomains = [...domains1].filter((d) => domains2.has(d));
        if (commonDomains.length === 0)
            return 0.5; // No overlap, neutral
        let totalAgreement = 0;
        for (const domain of commonDomains) {
            const d1Signals = signals1.filter((s) => s.domain === domain);
            const d2Signals = signals2.filter((s) => s.domain === domain);
            // Compare latest predictions
            const latest1 = d1Signals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            const latest2 = d2Signals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            if (latest1 && latest2) {
                totalAgreement +=
                    JSON.stringify(latest1.prediction) ===
                        JSON.stringify(latest2.prediction)
                        ? 1
                        : 0;
            }
        }
        return totalAgreement / commonDomains.length;
    }
}
exports.TrustCalculator = TrustCalculator;
function createTrustCalculator(config) {
    return new TrustCalculator(config);
}
