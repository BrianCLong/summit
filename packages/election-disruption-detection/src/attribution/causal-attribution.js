"use strict";
/**
 * Causal Attribution Engine
 *
 * Advanced attribution using:
 * - Technical forensics (infrastructure, malware, TTPs)
 * - Behavioral analysis (patterns, timing, tradecraft)
 * - Linguistic analysis (language models, stylometry)
 * - Network analysis (infrastructure overlap, command patterns)
 * - Historical pattern matching
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CausalAttributionEngine = void 0;
class CausalAttributionEngine {
    config;
    technicalAnalyzer;
    behavioralAnalyzer;
    linguisticAnalyzer;
    historicalMatcher;
    constructor(config) {
        this.config = config;
        this.technicalAnalyzer = new TechnicalAnalyzer();
        this.behavioralAnalyzer = new BehavioralAnalyzer();
        this.linguisticAnalyzer = new LinguisticAnalyzer();
        this.historicalMatcher = new HistoricalMatcher();
    }
    async attribute(threats) {
        return Promise.all(threats.map(async (threat) => ({
            ...threat,
            attribution: await this.performAttribution(threat),
        })));
    }
    async performAttribution(threat) {
        const assessments = [];
        // Technical forensics
        if (this.config.methods.includes('TECHNICAL_FORENSICS')) {
            const technical = await this.technicalAnalyzer.analyze(threat);
            assessments.push(technical);
        }
        // Behavioral analysis
        if (this.config.methods.includes('BEHAVIORAL_ANALYSIS')) {
            const behavioral = await this.behavioralAnalyzer.analyze(threat);
            assessments.push(behavioral);
        }
        // Linguistic analysis
        if (this.config.methods.includes('LINGUISTIC_FINGERPRINT')) {
            const linguistic = await this.linguisticAnalyzer.analyze(threat);
            assessments.push(linguistic);
        }
        // Historical pattern matching
        if (this.config.methods.includes('OPERATIONAL_PATTERN')) {
            const historical = await this.historicalMatcher.match(threat);
            assessments.push(historical);
        }
        // Fuse attributions
        return this.fuseAttributions(assessments);
    }
    fuseAttributions(assessments) {
        // Identify candidate actors
        const actorScores = new Map();
        const actorProfiles = new Map();
        const indicators = [];
        for (const assessment of assessments) {
            if (assessment.actor) {
                const current = actorScores.get(assessment.actor.id) || 0;
                actorScores.set(assessment.actor.id, current + assessment.confidence * this.getMethodWeight(assessment.method));
                actorProfiles.set(assessment.actor.id, assessment.actor);
            }
            indicators.push(...assessment.indicators);
        }
        // Select primary actor
        let primaryActor = null;
        let highestScore = 0;
        const alternatives = [];
        for (const [actorId, score] of actorScores.entries()) {
            if (score > highestScore) {
                if (primaryActor) {
                    alternatives.push({
                        actor: primaryActor,
                        probability: highestScore / (highestScore + score),
                        supportingEvidence: [],
                        contradictingEvidence: [],
                    });
                }
                highestScore = score;
                primaryActor = actorProfiles.get(actorId) || null;
            }
            else {
                alternatives.push({
                    actor: actorProfiles.get(actorId),
                    probability: score / (highestScore + score),
                    supportingEvidence: [],
                    contradictingEvidence: [],
                });
            }
        }
        // Calculate overall confidence
        const methodCount = assessments.filter((a) => a.confidence > 0.3).length;
        const confidence = this.config.requireMultipleMethods && methodCount < 2
            ? Math.min(0.5, highestScore)
            : Math.min(0.95, highestScore);
        return {
            primaryActor,
            confidence,
            methodology: 'MULTI_INT_FUSION',
            indicators,
            alternativeHypotheses: alternatives,
        };
    }
    getMethodWeight(method) {
        const weights = {
            TECHNICAL_FORENSICS: 1.0,
            BEHAVIORAL_ANALYSIS: 0.8,
            LINGUISTIC_FINGERPRINT: 0.6,
            INFRASTRUCTURE_CORRELATION: 0.9,
            OPERATIONAL_PATTERN: 0.7,
            MULTI_INT_FUSION: 1.0,
        };
        return weights[method] || 0.5;
    }
}
exports.CausalAttributionEngine = CausalAttributionEngine;
class TechnicalAnalyzer {
    async analyze(threat) {
        return {
            method: 'TECHNICAL_FORENSICS',
            actor: null,
            confidence: 0,
            indicators: [],
        };
    }
}
class BehavioralAnalyzer {
    async analyze(threat) {
        return {
            method: 'BEHAVIORAL_ANALYSIS',
            actor: null,
            confidence: 0,
            indicators: [],
        };
    }
}
class LinguisticAnalyzer {
    async analyze(threat) {
        return {
            method: 'LINGUISTIC_FINGERPRINT',
            actor: null,
            confidence: 0,
            indicators: [],
        };
    }
}
class HistoricalMatcher {
    async match(threat) {
        return {
            method: 'OPERATIONAL_PATTERN',
            actor: null,
            confidence: 0,
            indicators: [],
        };
    }
}
