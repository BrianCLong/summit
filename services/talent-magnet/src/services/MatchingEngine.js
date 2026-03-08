"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingEngine = exports.MatchingEngine = void 0;
const uuid_1 = require("uuid");
const types_js_1 = require("../models/types.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createChildLogger)('MatchingEngine');
const SKILL_LEVEL_VALUES = {
    [types_js_1.SkillLevel.BEGINNER]: 1,
    [types_js_1.SkillLevel.INTERMEDIATE]: 2,
    [types_js_1.SkillLevel.ADVANCED]: 3,
    [types_js_1.SkillLevel.EXPERT]: 4,
    [types_js_1.SkillLevel.THOUGHT_LEADER]: 5,
};
class MatchingEngine {
    /**
     * Calculate match score between talent and criteria
     */
    calculateMatch(talent, criteria) {
        const skillMatches = this.evaluateSkills(talent.skills, criteria);
        const signalStrength = this.evaluateSignals(talent.signals);
        // Weighted scoring
        const skillScore = this.calculateSkillScore(skillMatches);
        const signalScore = signalStrength * 100;
        // 60% skills, 30% signals, 10% other factors
        const matchScore = Math.round(skillScore * 0.6 + signalScore * 0.3 + talent.overallScore * 0.1);
        const recommendation = this.generateRecommendation(matchScore, skillMatches, criteria.urgency);
        logger.debug({ talentId: talent.id, matchScore }, 'Match calculated');
        return {
            talentId: talent.id,
            matchScore: Math.min(100, matchScore),
            skillMatches,
            signalStrength,
            recommendation,
        };
    }
    /**
     * Rank multiple talents against criteria
     */
    rankTalents(talents, criteria) {
        const results = talents.map((talent) => this.calculateMatch(talent, criteria));
        return results.sort((a, b) => b.matchScore - a.matchScore);
    }
    /**
     * Detect talent signals from external data
     */
    detectSignals(data) {
        const signals = [];
        const now = new Date();
        // GitHub activity signal
        if (data.githubStars && Number(data.githubStars) > 100) {
            signals.push({
                id: (0, uuid_1.v4)(),
                category: 'open_source',
                source: 'github',
                sourceUrl: data.githubUrl,
                title: 'High-impact open source contributor',
                score: Math.min(100, Number(data.githubStars) / 10),
                confidence: 0.9,
                detectedAt: now,
                metadata: { stars: data.githubStars },
            });
        }
        // Publication signal
        if (data.publications && Number(data.publications) > 5) {
            signals.push({
                id: (0, uuid_1.v4)(),
                category: 'publications',
                source: 'academic',
                title: 'Published researcher',
                score: Math.min(100, Number(data.publications) * 10),
                confidence: 0.85,
                detectedAt: now,
                metadata: { count: data.publications },
            });
        }
        // Patent signal
        if (data.patents && Number(data.patents) > 0) {
            signals.push({
                id: (0, uuid_1.v4)(),
                category: 'patents',
                source: 'patent_office',
                title: 'Patent holder',
                score: Math.min(100, Number(data.patents) * 25),
                confidence: 0.95,
                detectedAt: now,
                metadata: { count: data.patents },
            });
        }
        // Award signal
        if (data.awards && Array.isArray(data.awards)) {
            signals.push({
                id: (0, uuid_1.v4)(),
                category: 'awards',
                source: 'verified',
                title: 'Award recipient',
                score: Math.min(100, data.awards.length * 20),
                confidence: 0.9,
                detectedAt: now,
                metadata: { awards: data.awards },
            });
        }
        logger.info({ signalCount: signals.length }, 'Signals detected');
        return signals;
    }
    evaluateSkills(skills, criteria) {
        const matches = [];
        const skillMap = new Map(skills.map((s) => [s.name.toLowerCase(), s]));
        // Check required skills
        for (const required of criteria.requiredSkills) {
            const skill = skillMap.get(required.toLowerCase());
            matches.push({
                skill: required,
                required: true,
                matched: !!skill,
                level: skill?.level || 'none', // Line 173 equivalent
                gap: skill ? 0 : 3,
            });
        }
        // Check preferred skills
        for (const preferred of criteria.preferredSkills || []) {
            const skill = skillMap.get(preferred.toLowerCase());
            matches.push({
                skill: preferred,
                required: false,
                matched: !!skill,
                level: skill?.level || 'none', // Line 186 equivalent
                gap: skill ? 0 : 2,
            });
        }
        return matches;
    }
    evaluateSignals(signals) {
        if (signals.length === 0) {
            return 0;
        }
        const weightedSum = signals.reduce((sum, signal) => {
            return sum + signal.score * signal.confidence;
        }, 0);
        return Math.min(1, weightedSum / (signals.length * 100));
    }
    calculateSkillScore(matches) {
        if (matches.length === 0) {
            return 50;
        }
        const requiredMatches = matches.filter((m) => m.required);
        const preferredMatches = matches.filter((m) => !m.required);
        const requiredScore = requiredMatches.length > 0
            ? (requiredMatches.filter((m) => m.matched).length /
                requiredMatches.length) *
                100
            : 100;
        const preferredScore = preferredMatches.length > 0
            ? (preferredMatches.filter((m) => m.matched).length /
                preferredMatches.length) *
                100
            : 50;
        // Required skills are weighted more heavily
        return requiredScore * 0.7 + preferredScore * 0.3;
    }
    generateRecommendation(score, matches, urgency) {
        const missingRequired = matches.filter((m) => m.required && !m.matched);
        if (score >= 85) {
            return 'Highly recommended - Proceed with immediate outreach';
        }
        if (score >= 70) {
            if (missingRequired.length === 0) {
                return 'Strong candidate - Schedule initial contact';
            }
            return `Good potential - Consider upskilling for: ${missingRequired.map((m) => m.skill).join(', ')}`;
        }
        if (score >= 50 && urgency === 'critical') {
            return 'Viable option for urgent needs - Fast-track assessment';
        }
        if (score >= 50) {
            return 'Monitor and nurture - Add to talent pipeline';
        }
        return 'Low priority - Keep in database for future opportunities';
    }
}
exports.MatchingEngine = MatchingEngine;
exports.matchingEngine = new MatchingEngine();
