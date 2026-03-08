"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridScorer = exports.ProbabilisticScorer = exports.DeterministicScorer = void 0;
exports.buildFeatureContributions = buildFeatureContributions;
exports.createScorer = createScorer;
const features_js_1 = require("../core/features.js");
function buildFeatureContributions(features, weights) {
    const entries = Object.entries(weights).map(([feature, weight]) => {
        const rawValue = features[feature];
        let numericValue = 0;
        if (typeof rawValue === 'boolean') {
            numericValue = rawValue ? 1 : 0;
        }
        else if (typeof rawValue === 'number') {
            numericValue = rawValue;
        }
        else {
            numericValue = 0;
        }
        return {
            feature,
            value: rawValue,
            weight,
            contribution: numericValue * weight,
            normalizedContribution: 0,
        };
    });
    const total = entries.reduce((sum, entry) => sum + entry.contribution, 0);
    return entries
        .map(entry => ({
        ...entry,
        normalizedContribution: total > 0 ? entry.contribution / total : 0,
    }))
        .sort((a, b) => b.contribution - a.contribution);
}
/**
 * Deterministic scorer using weighted feature combination
 */
class DeterministicScorer {
    config;
    constructor(config) {
        this.config = config;
    }
    score(entityA, entityB) {
        const features = (0, features_js_1.extractFeatures)(entityA, entityB);
        const weights = this.config.weights;
        // Calculate weighted score
        let score = 0;
        score += features.nameSimilarity * weights.nameSimilarity;
        score += (features.typeMatch ? 1 : 0) * weights.typeMatch;
        score += features.propertyOverlap * weights.propertyOverlap;
        score += features.semanticSimilarity * weights.semanticSimilarity;
        score += features.geographicProximity * weights.geographicProximity;
        score += features.temporalCoOccurrence * weights.temporalCoOccurrence;
        score += features.deviceIdMatch * weights.deviceIdMatch;
        score += features.accountIdMatch * weights.accountIdMatch;
        // Normalize to 0-1
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        score = score / totalWeight;
        // Build rationale
        const rationale = this.buildRationale(features);
        // Confidence is equal to score for deterministic
        const confidence = score;
        return {
            entityId: entityB.id,
            score: Number(score.toFixed(3)),
            confidence: Number(confidence.toFixed(3)),
            features,
            rationale,
            method: 'deterministic',
        };
    }
    getMethod() {
        return 'deterministic';
    }
    buildRationale(features) {
        const rationale = [];
        if (features.nameSimilarity > 0.5) {
            rationale.push(`Name similarity: ${(features.nameSimilarity * 100).toFixed(1)}%`);
        }
        if (features.aliasSimilarity > 0.5) {
            rationale.push(`Alias match: ${(features.aliasSimilarity * 100).toFixed(1)}%`);
        }
        if (features.typeMatch) {
            rationale.push(`Type matches: ${features.typeMatch}`);
        }
        if (features.propertyOverlap > 0.3) {
            rationale.push(`Property overlap: ${(features.propertyOverlap * 100).toFixed(1)}%`);
        }
        if (features.semanticSimilarity > 0.3) {
            rationale.push(`Semantic match: ${(features.semanticSimilarity * 100).toFixed(1)}%`);
        }
        if (features.geographicProximity > 0.7) {
            rationale.push(`Geographic proximity: ${(features.geographicProximity * 100).toFixed(1)}%`);
        }
        if (features.deviceIdMatch > 0) {
            rationale.push(`Device ID match: ${(features.deviceIdMatch * 100).toFixed(1)}%`);
        }
        if (features.accountIdMatch > 0) {
            rationale.push(`Account ID match: ${(features.accountIdMatch * 100).toFixed(1)}%`);
        }
        if (features.phoneticSimilarity === 1) {
            rationale.push('Phonetic signature aligned');
        }
        return rationale;
    }
}
exports.DeterministicScorer = DeterministicScorer;
/**
 * Probabilistic scorer using Bayesian-inspired confidence estimation
 */
class ProbabilisticScorer {
    config;
    constructor(config) {
        this.config = config;
    }
    score(entityA, entityB) {
        const features = (0, features_js_1.extractFeatures)(entityA, entityB);
        // Calculate base score using weights
        const baseScore = this.calculateBaseScore(features);
        // Calculate confidence using Bayesian-inspired approach
        const confidence = this.calculateConfidence(features);
        // Final score is baseScore adjusted by confidence
        const score = baseScore * confidence;
        const rationale = this.buildRationale(features, confidence);
        return {
            entityId: entityB.id,
            score: Number(score.toFixed(3)),
            confidence: Number(confidence.toFixed(3)),
            features,
            rationale,
            method: 'probabilistic',
        };
    }
    getMethod() {
        return 'probabilistic';
    }
    calculateBaseScore(features) {
        const weights = this.config.weights;
        let score = 0;
        score += features.nameSimilarity * weights.nameSimilarity;
        score += (features.typeMatch ? 1 : 0) * weights.typeMatch;
        score += features.propertyOverlap * weights.propertyOverlap;
        score += features.semanticSimilarity * weights.semanticSimilarity;
        score += features.geographicProximity * weights.geographicProximity;
        score += features.temporalCoOccurrence * weights.temporalCoOccurrence;
        score += features.deviceIdMatch * weights.deviceIdMatch;
        score += features.accountIdMatch * weights.accountIdMatch;
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        return score / totalWeight;
    }
    calculateConfidence(features) {
        // Confidence is based on number and strength of signals
        const signals = [];
        // Strong signals (high weight)
        if (features.nameSimilarity > 0.8) {
            signals.push(1.0);
        }
        else if (features.nameSimilarity > 0.6) {
            signals.push(0.7);
        }
        else if (features.nameSimilarity > 0.4) {
            signals.push(0.4);
        }
        if (features.typeMatch) {
            signals.push(0.8);
        }
        // Medium signals
        if (features.deviceIdMatch > 0.5) {
            signals.push(0.9);
        }
        if (features.accountIdMatch > 0.5) {
            signals.push(0.7);
        }
        if (features.geographicProximity > 0.8) {
            signals.push(0.7);
        }
        if (features.semanticSimilarity > 0.5) {
            signals.push(0.6);
        }
        // Weak signals
        if (features.propertyOverlap > 0.5) {
            signals.push(0.5);
        }
        if (features.temporalCoOccurrence > 0.5) {
            signals.push(0.5);
        }
        if (features.phoneticSimilarity === 1) {
            signals.push(0.4);
        }
        // Combine signals using noisy-OR model
        let confidence = 0;
        for (const signal of signals) {
            confidence = confidence + signal * (1 - confidence);
        }
        return confidence;
    }
    buildRationale(features, confidence) {
        const rationale = [];
        rationale.push(`Confidence: ${(confidence * 100).toFixed(1)}%`);
        if (features.nameSimilarity > 0.5) {
            rationale.push(`Name similarity: ${(features.nameSimilarity * 100).toFixed(1)}%`);
        }
        if (features.deviceIdMatch > 0.5) {
            rationale.push(`Strong device ID match: ${(features.deviceIdMatch * 100).toFixed(1)}%`);
        }
        if (features.accountIdMatch > 0.5) {
            rationale.push(`Account ID match: ${(features.accountIdMatch * 100).toFixed(1)}%`);
        }
        if (features.geographicProximity > 0.7) {
            rationale.push(`High geographic proximity`);
        }
        if (features.semanticSimilarity > 0.5) {
            rationale.push(`Semantic attributes align`);
        }
        return rationale;
    }
}
exports.ProbabilisticScorer = ProbabilisticScorer;
/**
 * Hybrid scorer combining deterministic and probabilistic approaches
 */
class HybridScorer {
    deterministicScorer;
    probabilisticScorer;
    constructor(config) {
        this.deterministicScorer = new DeterministicScorer(config);
        this.probabilisticScorer = new ProbabilisticScorer(config);
    }
    score(entityA, entityB) {
        const detScore = this.deterministicScorer.score(entityA, entityB);
        const probScore = this.probabilisticScorer.score(entityA, entityB);
        // Combine scores: weighted average
        // Use probabilistic confidence to weight the combination
        const weight = probScore.confidence;
        const combinedScore = (probScore.score * weight) + (detScore.score * (1 - weight));
        const combinedConfidence = (probScore.confidence + detScore.score) / 2;
        // Merge rationale from both methods
        const rationale = [
            ...new Set([...detScore.rationale, ...probScore.rationale]),
            `Hybrid score (det: ${detScore.score.toFixed(3)}, prob: ${probScore.score.toFixed(3)})`,
        ];
        return {
            entityId: entityB.id,
            score: Number(combinedScore.toFixed(3)),
            confidence: Number(combinedConfidence.toFixed(3)),
            features: detScore.features,
            rationale,
            method: 'hybrid',
        };
    }
    getMethod() {
        return 'hybrid';
    }
}
exports.HybridScorer = HybridScorer;
/**
 * Factory to create appropriate scorer based on method
 */
function createScorer(config) {
    switch (config.method) {
        case 'deterministic':
            return new DeterministicScorer(config);
        case 'probabilistic':
            return new ProbabilisticScorer(config);
        case 'hybrid':
            return new HybridScorer(config);
        default:
            return new HybridScorer(config);
    }
}
