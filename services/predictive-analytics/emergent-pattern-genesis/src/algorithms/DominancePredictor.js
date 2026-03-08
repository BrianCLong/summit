"use strict";
/**
 * Dominance Predictor
 * Predicts which patterns will dominate
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DominancePredictor = void 0;
const DominanceScore_js_1 = require("../models/DominanceScore.js");
class DominancePredictor {
    /**
     * Predict dominant patterns
     */
    async predictDominance(protoPatterns, config) {
        const scores = [];
        for (const pattern of protoPatterns) {
            const score = await this.calculateDominanceScore(pattern, protoPatterns, config);
            if (score.score >= config.minScore) {
                scores.push(score);
            }
        }
        // Rank by score
        const ranked = scores.sort((a, b) => b.score - a.score);
        // Assign ranks
        ranked.forEach((score, index) => {
            score.rank = index + 1;
        });
        return ranked.slice(0, config.topK);
    }
    /**
     * Calculate dominance score for a pattern
     */
    async calculateDominanceScore(pattern, allPatterns, config) {
        // Calculate component scores
        const growthRate = this.estimateGrowthRate(pattern);
        const fitnessScore = this.calculateFitness(pattern, allPatterns);
        const resilienceScore = this.calculateResilience(pattern);
        const networkScore = this.calculateNetworkScore(pattern);
        // Create dominance score
        const dominanceScore = new DominanceScore_js_1.DominanceScoreModel({
            patternId: pattern.id,
            growthRate: growthRate,
            fitnessScore: fitnessScore,
            resilienceScore: resilienceScore,
            networkScore: networkScore,
            rank: 0,
            confidence: 0,
        });
        // Calculate overall score
        dominanceScore.calculateScore(config.weights);
        // Calculate confidence
        const dataQuality = this.assessDataQuality(pattern);
        const historicalAccuracy = 0.8; // Would come from model tracking
        dominanceScore.calculateConfidence(dataQuality, historicalAccuracy);
        return dominanceScore;
    }
    /**
     * Estimate growth rate
     */
    estimateGrowthRate(pattern) {
        if (pattern.weakSignals.length < 2) {
            return pattern.confidence * 0.1;
        }
        // Calculate growth from signal history
        const signals = [...pattern.weakSignals].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const strengthHistory = signals.map((s, i) => ({
            time: i,
            strength: s.strength,
        }));
        const growthRate = DominanceScore_js_1.DominanceScoreModel.calculateGrowthRate(strengthHistory);
        return Math.max(0, growthRate);
    }
    /**
     * Calculate fitness score
     */
    calculateFitness(pattern, allPatterns) {
        const intrinsicStrength = pattern.confidence * pattern.completeness;
        // Calculate competition intensities
        const competitionIntensities = allPatterns
            .filter((p) => p.id !== pattern.id)
            .map((p) => this.calculateCompetitionIntensity(pattern, p));
        return DominanceScore_js_1.DominanceScoreModel.calculateFitness(intrinsicStrength, competitionIntensities);
    }
    /**
     * Calculate competition intensity between patterns
     */
    calculateCompetitionIntensity(p1, p2) {
        // Competition based on resource overlap
        const signalOverlap = this.calculateSignalOverlap(p1, p2);
        const structuralOverlap = this.calculateStructuralOverlap(p1, p2);
        return (signalOverlap + structuralOverlap) / 2;
    }
    /**
     * Calculate signal overlap
     */
    calculateSignalOverlap(p1, p2) {
        const signals1 = new Set(p1.weakSignals.map((s) => `${s.type}_${JSON.stringify(s.location)}`));
        const signals2 = new Set(p2.weakSignals.map((s) => `${s.type}_${JSON.stringify(s.location)}`));
        const intersection = new Set([...signals1].filter((x) => signals2.has(x)));
        const union = new Set([...signals1, ...signals2]);
        return union.size > 0 ? intersection.size / union.size : 0;
    }
    /**
     * Calculate structural overlap
     */
    calculateStructuralOverlap(p1, p2) {
        const nodes1 = p1.partialMotif.subgraph?.nodes || [];
        const nodes2 = p2.partialMotif.subgraph?.nodes || [];
        const nodeIds1 = new Set(nodes1.map((n) => n.id));
        const nodeIds2 = new Set(nodes2.map((n) => n.id));
        const intersection = new Set([...nodeIds1].filter((x) => nodeIds2.has(x)));
        const union = new Set([...nodeIds1, ...nodeIds2]);
        return union.size > 0 ? intersection.size / union.size : 0;
    }
    /**
     * Calculate resilience score
     */
    calculateResilience(pattern) {
        const structuralRedundancy = this.calculateStructuralRedundancy(pattern);
        const resourceDiversity = this.calculateResourceDiversity(pattern);
        return DominanceScore_js_1.DominanceScoreModel.calculateResilience(structuralRedundancy, resourceDiversity);
    }
    /**
     * Calculate structural redundancy
     */
    calculateStructuralRedundancy(pattern) {
        const nodes = pattern.partialMotif.subgraph?.nodes || [];
        const edges = pattern.partialMotif.subgraph?.edges || [];
        if (nodes.length === 0) {
            return 0;
        }
        // Redundancy based on connectivity
        // More connections per node = higher redundancy
        const avgDegree = nodes.length > 0 ? (2 * edges.length) / nodes.length : 0;
        return Math.min(1, avgDegree / 4); // Normalize to 0-1
    }
    /**
     * Calculate resource diversity
     */
    calculateResourceDiversity(pattern) {
        // Diversity based on number of different signal types and node types
        const signalTypes = new Set(pattern.weakSignals.map((s) => s.type));
        const nodeTypes = new Set((pattern.partialMotif.subgraph?.nodes || []).map((n) => n.type));
        const totalTypes = signalTypes.size + nodeTypes.size;
        return Math.min(1, totalTypes / 10); // Normalize to 0-1
    }
    /**
     * Calculate network score
     */
    calculateNetworkScore(pattern) {
        const nodes = pattern.partialMotif.subgraph?.nodes || [];
        // Count connected components (approximation)
        const connectedComponents = nodes.length;
        return DominanceScore_js_1.DominanceScoreModel.calculateNetworkScore(connectedComponents, 0.5);
    }
    /**
     * Assess data quality
     */
    assessDataQuality(pattern) {
        let quality = 0;
        // More weak signals = better data
        quality += Math.min(0.3, pattern.weakSignals.length / 20);
        // Higher completeness = better data
        quality += pattern.completeness * 0.3;
        // Recent detection = fresher data
        const daysSinceDetection = (Date.now() - pattern.detectedAt.getTime()) / (1000 * 60 * 60 * 24);
        quality += Math.max(0, 0.4 - daysSinceDetection / 30);
        return Math.min(1, quality);
    }
    /**
     * Predict time to dominance
     */
    async predictTimeToDominance(pattern, dominanceScore) {
        if (dominanceScore.growthRate <= 0) {
            return Infinity;
        }
        // Estimate time for pattern to reach dominance threshold
        const currentStrength = pattern.confidence;
        const dominanceThreshold = 0.8;
        const growthRate = dominanceScore.growthRate;
        // Exponential growth: S(t) = S0 * e^(r*t)
        // t = ln(S(t) / S0) / r
        const time = Math.log(dominanceThreshold / currentStrength) / growthRate;
        return Math.max(0, time);
    }
    /**
     * Identify critical success factors
     */
    async identifyCriticalFactors(pattern, dominanceScore) {
        const factors = [];
        // Get top contributing factors
        const topFactors = dominanceScore.getTopFactors(3);
        for (const factor of topFactors) {
            if (factor.contribution > 0.2) {
                // High contribution
                factors.push(factor.name);
            }
        }
        // Check for specific conditions
        if (dominanceScore.growthRate > 0.5) {
            factors.push('Rapid growth trajectory');
        }
        if (dominanceScore.resilienceScore > 0.7) {
            factors.push('High resilience to disruption');
        }
        if (dominanceScore.networkScore > 1.5) {
            factors.push('Strong network effects');
        }
        return factors;
    }
}
exports.DominancePredictor = DominancePredictor;
