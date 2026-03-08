"use strict";
/**
 * Predictive Signal Model
 * Represents an individual prediction from an intelligence source
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveSignalFactory = void 0;
exports.groupSignalsByDomain = groupSignalsByDomain;
exports.calculateConsensus = calculateConsensus;
exports.getWeightedPrediction = getWeightedPrediction;
class PredictiveSignalFactory {
    static create(input) {
        return {
            id: crypto.randomUUID(),
            sourceId: input.sourceId,
            prediction: input.prediction,
            confidence: Math.max(0, Math.min(1, input.confidence)),
            timestamp: new Date(),
            horizon: Math.max(1, input.horizon),
            domain: input.domain,
            evidence: input.evidence,
        };
    }
    static validate(signal) {
        if (!signal.id || !signal.sourceId || !signal.domain) {
            return false;
        }
        if (signal.confidence < 0 || signal.confidence > 1) {
            return false;
        }
        if (signal.horizon <= 0) {
            return false;
        }
        return true;
    }
    static isExpired(signal) {
        const expirationTime = signal.timestamp.getTime() + signal.horizon * 3600000;
        return Date.now() > expirationTime;
    }
    static getRemainingHorizon(signal) {
        const elapsed = (Date.now() - signal.timestamp.getTime()) / 3600000;
        return Math.max(0, signal.horizon - elapsed);
    }
    static adjustConfidence(signal, sourceTrust) {
        // Weighted confidence based on source trust
        const adjustedConfidence = signal.confidence * sourceTrust;
        return {
            ...signal,
            confidence: adjustedConfidence,
        };
    }
}
exports.PredictiveSignalFactory = PredictiveSignalFactory;
function groupSignalsByDomain(signals) {
    const groups = new Map();
    for (const signal of signals) {
        const existing = groups.get(signal.domain) || [];
        groups.set(signal.domain, [...existing, signal]);
    }
    return groups;
}
function calculateConsensus(signals) {
    if (signals.length <= 1)
        return 1.0;
    // Calculate variance in predictions
    const predictions = signals.map((s) => s.prediction);
    const uniquePredictions = new Set(predictions.map((p) => JSON.stringify(p)));
    // Higher consensus when fewer unique predictions
    return 1 - (uniquePredictions.size - 1) / signals.length;
}
function getWeightedPrediction(signals, weights) {
    if (signals.length === 0)
        return null;
    if (signals.length === 1)
        return signals[0].prediction;
    // Numeric prediction averaging
    const numericSignals = signals.filter((s) => typeof s.prediction === 'number');
    if (numericSignals.length === signals.length) {
        let totalWeight = 0;
        let weightedSum = 0;
        for (const signal of numericSignals) {
            const weight = (weights.get(signal.sourceId) || 1) * signal.confidence;
            weightedSum += signal.prediction * weight;
            totalWeight += weight;
        }
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    // Categorical prediction - weighted voting
    const votes = new Map();
    for (const signal of signals) {
        const key = JSON.stringify(signal.prediction);
        const weight = (weights.get(signal.sourceId) || 1) * signal.confidence;
        votes.set(key, (votes.get(key) || 0) + weight);
    }
    let maxVotes = 0;
    let winner = signals[0].prediction;
    for (const [key, voteCount] of votes) {
        if (voteCount > maxVotes) {
            maxVotes = voteCount;
            winner = JSON.parse(key);
        }
    }
    return winner;
}
