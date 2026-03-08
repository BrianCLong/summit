"use strict";
/**
 * Conflict Resolver Algorithm
 * Resolves conflicts between divergent predictive signals
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictResolver = void 0;
exports.createConflictResolver = createConflictResolver;
const SignalBraid_js_1 = require("../models/SignalBraid.js");
class ConflictResolver {
    config;
    constructor(config = {
        divergenceThreshold: 0.3,
        requireExpertForHighConflict: true,
        highConflictThreshold: 0.7,
    }) {
        this.config = config;
    }
    detectConflicts(signals) {
        if (signals.length <= 1) {
            return {
                hasConflict: false,
                conflictingSignals: [],
                divergenceScore: 0,
                suggestedMethod: SignalBraid_js_1.ResolutionMethod.TRUST_WEIGHTED_AVERAGE,
            };
        }
        // Group by prediction value
        const predictionGroups = new Map();
        for (const signal of signals) {
            const key = JSON.stringify(signal.prediction);
            const group = predictionGroups.get(key) || [];
            predictionGroups.set(key, [...group, signal]);
        }
        // Calculate divergence
        const numGroups = predictionGroups.size;
        const divergenceScore = (numGroups - 1) / Math.max(signals.length - 1, 1);
        if (divergenceScore < this.config.divergenceThreshold) {
            return {
                hasConflict: false,
                conflictingSignals: [],
                divergenceScore,
                suggestedMethod: SignalBraid_js_1.ResolutionMethod.TRUST_WEIGHTED_AVERAGE,
            };
        }
        // Find conflicting signals (minority groups)
        const sortedGroups = [...predictionGroups.values()].sort((a, b) => b.length - a.length);
        const conflictingSignals = sortedGroups.slice(1).flat();
        return {
            hasConflict: true,
            conflictingSignals,
            divergenceScore,
            suggestedMethod: this.suggestResolutionMethod(divergenceScore, signals),
        };
    }
    suggestResolutionMethod(divergenceScore, signals) {
        if (divergenceScore >= this.config.highConflictThreshold &&
            this.config.requireExpertForHighConflict) {
            return SignalBraid_js_1.ResolutionMethod.EXPERT_OVERRIDE;
        }
        // Check if signals have temporal ordering
        const timestamps = signals.map((s) => s.timestamp.getTime());
        const hasTemporalSpread = Math.max(...timestamps) - Math.min(...timestamps) > 3600000; // 1 hour
        if (hasTemporalSpread) {
            return SignalBraid_js_1.ResolutionMethod.TEMPORAL_PRIORITY;
        }
        // Default to Bayesian fusion for moderate conflicts
        if (divergenceScore >= 0.5) {
            return SignalBraid_js_1.ResolutionMethod.BAYESIAN_FUSION;
        }
        return SignalBraid_js_1.ResolutionMethod.TRUST_WEIGHTED_AVERAGE;
    }
    resolve(conflictingSignals, method, sources, trustScores, expertOverride) {
        let resolvedValue;
        let confidence;
        let reasoning;
        switch (method) {
            case SignalBraid_js_1.ResolutionMethod.TRUST_WEIGHTED_AVERAGE:
                ({ resolvedValue, confidence, reasoning } = this.trustWeightedResolve(conflictingSignals, trustScores));
                break;
            case SignalBraid_js_1.ResolutionMethod.MAJORITY_VOTE:
                ({ resolvedValue, confidence, reasoning } = this.majorityVoteResolve(conflictingSignals));
                break;
            case SignalBraid_js_1.ResolutionMethod.BAYESIAN_FUSION:
                ({ resolvedValue, confidence, reasoning } = this.bayesianResolve(conflictingSignals, trustScores));
                break;
            case SignalBraid_js_1.ResolutionMethod.EXPERT_OVERRIDE:
                if (expertOverride === undefined) {
                    throw new Error('Expert override requires explicit value');
                }
                resolvedValue = expertOverride;
                confidence = 0.95;
                reasoning = 'Expert override applied';
                break;
            case SignalBraid_js_1.ResolutionMethod.TEMPORAL_PRIORITY:
                ({ resolvedValue, confidence, reasoning } = this.temporalResolve(conflictingSignals));
                break;
            case SignalBraid_js_1.ResolutionMethod.DOMAIN_AUTHORITY:
                ({ resolvedValue, confidence, reasoning } = this.domainAuthorityResolve(conflictingSignals, sources, trustScores));
                break;
            default:
                ({ resolvedValue, confidence, reasoning } = this.trustWeightedResolve(conflictingSignals, trustScores));
        }
        return {
            id: crypto.randomUUID(),
            conflictingSignalIds: conflictingSignals.map((s) => s.id),
            resolvedValue,
            resolutionMethod: method,
            confidence,
            reasoning,
            resolvedAt: new Date(),
        };
    }
    trustWeightedResolve(signals, trustScores) {
        const weightedVotes = new Map();
        let totalWeight = 0;
        for (const signal of signals) {
            const trust = trustScores.get(signal.sourceId);
            const weight = (trust?.overallScore ?? 0.5) * signal.confidence;
            const key = JSON.stringify(signal.prediction);
            weightedVotes.set(key, (weightedVotes.get(key) || 0) + weight);
            totalWeight += weight;
        }
        let maxWeight = 0;
        let resolvedValue;
        for (const [key, weight] of weightedVotes) {
            if (weight > maxWeight) {
                maxWeight = weight;
                resolvedValue = JSON.parse(key);
            }
        }
        return {
            resolvedValue,
            confidence: totalWeight > 0 ? maxWeight / totalWeight : 0,
            reasoning: `Trust-weighted resolution from ${signals.length} signals`,
        };
    }
    majorityVoteResolve(signals) {
        const votes = new Map();
        for (const signal of signals) {
            const key = JSON.stringify(signal.prediction);
            votes.set(key, (votes.get(key) || 0) + 1);
        }
        let maxVotes = 0;
        let resolvedValue;
        for (const [key, voteCount] of votes) {
            if (voteCount > maxVotes) {
                maxVotes = voteCount;
                resolvedValue = JSON.parse(key);
            }
        }
        return {
            resolvedValue,
            confidence: maxVotes / signals.length,
            reasoning: `Majority vote: ${maxVotes}/${signals.length} signals agreed`,
        };
    }
    bayesianResolve(signals, trustScores) {
        const posteriors = new Map();
        const uniquePredictions = new Set(signals.map((s) => JSON.stringify(s.prediction)));
        const prior = 1 / uniquePredictions.size;
        for (const signal of signals) {
            const key = JSON.stringify(signal.prediction);
            const trust = trustScores.get(signal.sourceId);
            const likelihood = (trust?.accuracyScore ?? 0.5) * signal.confidence;
            const currentPosterior = posteriors.get(key) ?? prior;
            const evidence = currentPosterior * likelihood +
                (1 - currentPosterior) * (1 - likelihood);
            const newPosterior = (currentPosterior * likelihood) / evidence;
            posteriors.set(key, newPosterior);
        }
        let maxPosterior = 0;
        let resolvedValue;
        for (const [key, posterior] of posteriors) {
            if (posterior > maxPosterior) {
                maxPosterior = posterior;
                resolvedValue = JSON.parse(key);
            }
        }
        return {
            resolvedValue,
            confidence: maxPosterior,
            reasoning: `Bayesian fusion with posterior probability ${maxPosterior.toFixed(3)}`,
        };
    }
    temporalResolve(signals) {
        // Most recent signal wins, weighted by confidence
        const sorted = [...signals].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const mostRecent = sorted[0];
        const secondMostRecent = sorted[1];
        // Confidence decreases if most recent disagrees with second most recent
        let confidence = mostRecent.confidence;
        if (secondMostRecent &&
            JSON.stringify(mostRecent.prediction) !==
                JSON.stringify(secondMostRecent.prediction)) {
            confidence *= 0.8;
        }
        return {
            resolvedValue: mostRecent.prediction,
            confidence,
            reasoning: `Temporal priority: most recent signal from ${mostRecent.timestamp.toISOString()}`,
        };
    }
    domainAuthorityResolve(signals, sources, trustScores) {
        // Find the most authoritative source for this domain
        let maxAuthority = 0;
        let authoritySignal = null;
        for (const signal of signals) {
            const source = sources.get(signal.sourceId);
            const trust = trustScores.get(signal.sourceId);
            if (!source || !trust)
                continue;
            // Authority = trust * reliability * confidence
            const authority = trust.overallScore * source.reliability * signal.confidence;
            if (authority > maxAuthority) {
                maxAuthority = authority;
                authoritySignal = signal;
            }
        }
        if (!authoritySignal) {
            return this.trustWeightedResolve(signals, trustScores);
        }
        return {
            resolvedValue: authoritySignal.prediction,
            confidence: maxAuthority,
            reasoning: `Domain authority: source ${authoritySignal.sourceId} with authority score ${maxAuthority.toFixed(3)}`,
        };
    }
}
exports.ConflictResolver = ConflictResolver;
function createConflictResolver(config) {
    return new ConflictResolver(config);
}
