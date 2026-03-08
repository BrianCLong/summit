"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextPersistence = void 0;
const uuid_1 = require("uuid");
const logger_js_1 = require("../utils/logger.js");
/**
 * Context Persistence Layer
 * Learns from user feedback and corrections to improve fusion over time
 */
class ContextPersistence {
    config;
    feedback = new Map();
    contexts = new Map();
    corrections = new Map();
    constructor(config = {}) {
        this.config = {
            maxFeedbackHistory: config.maxFeedbackHistory ?? 1000,
            learningThreshold: config.learningThreshold ?? 3,
            decayFactor: config.decayFactor ?? 0.95,
        };
    }
    /**
     * Record user feedback on a fusion result
     */
    recordFeedback(userId, fusionResult, feedbackType, correction, comment) {
        const feedback = {
            id: (0, uuid_1.v4)(),
            userId,
            targetType: 'fusion',
            targetId: fusionResult.id,
            feedbackType,
            correction,
            comment,
            createdAt: new Date(),
        };
        // Store feedback
        const key = fusionResult.id;
        const existing = this.feedback.get(key) || [];
        existing.push(feedback);
        // Trim old feedback
        if (existing.length > this.config.maxFeedbackHistory) {
            existing.shift();
        }
        this.feedback.set(key, existing);
        // Process feedback for learning
        this.processForLearning(fusionResult, feedback);
        logger_js_1.logger.info('Feedback recorded', {
            feedbackId: feedback.id,
            targetId: fusionResult.id,
            type: feedbackType,
        });
        return feedback;
    }
    /**
     * Process feedback to learn patterns
     */
    processForLearning(result, feedback) {
        if (feedback.feedbackType === 'correct') {
            // Reinforce current fusion rules
            this.reinforceFusionRules(result);
        }
        else if (feedback.correction) {
            // Learn from correction
            this.learnFromCorrection(result, feedback.correction);
        }
    }
    /**
     * Reinforce fusion rules that produced correct results
     */
    reinforceFusionRules(result) {
        for (const sourceId of result.lineage.sources) {
            const context = this.getOrCreateContext(sourceId);
            // Boost confidence in rules used for this fusion
            for (const rule of context.fusionRules) {
                rule.confidence = Math.min(1, rule.confidence + 0.05);
            }
            this.contexts.set(sourceId, context);
        }
    }
    /**
     * Learn from user corrections
     */
    learnFromCorrection(result, correction) {
        for (const [field, correctValue] of Object.entries(correction)) {
            const wrongValue = result.fusedRecord[field];
            if (wrongValue === correctValue)
                continue;
            // Record correction
            const key = `${result.lineage.sources.join(',')}:${field}`;
            const corrections = this.corrections.get(key) || [];
            const existing = corrections.find(c => String(c.wrongValue) === String(wrongValue));
            if (existing) {
                existing.correctValue = correctValue;
                existing.occurrences++;
            }
            else {
                corrections.push({
                    field,
                    wrongValue,
                    correctValue,
                    occurrences: 1,
                    learnedAt: new Date(),
                });
            }
            this.corrections.set(key, corrections);
            // Check if we have enough data to create a rule
            if (corrections.length >= this.config.learningThreshold) {
                this.createCorrectionRule(result.lineage.sources, field, corrections);
            }
        }
    }
    /**
     * Create a learned correction rule
     */
    createCorrectionRule(sourceIds, field, corrections) {
        // Find most common correction pattern
        const sorted = corrections.sort((a, b) => b.occurrences - a.occurrences);
        const topCorrection = sorted[0];
        if (topCorrection.occurrences >= this.config.learningThreshold) {
            for (const sourceId of sourceIds) {
                const context = this.getOrCreateContext(sourceId);
                // Add or update rule
                const existingRule = context.fusionRules.find(r => r.pattern === `${field}:${String(topCorrection.wrongValue)}`);
                if (existingRule) {
                    existingRule.confidence = Math.min(1, existingRule.confidence + 0.1);
                    existingRule.learnedFrom.push(...corrections.map(c => String(c.wrongValue)));
                }
                else {
                    context.fusionRules.push({
                        pattern: `${field}:${String(topCorrection.wrongValue)}`,
                        action: `replace:${String(topCorrection.correctValue)}`,
                        confidence: 0.6,
                        learnedFrom: corrections.map(c => String(c.wrongValue)),
                    });
                }
                // Update corrections list
                context.corrections.push({
                    field,
                    wrongValue: topCorrection.wrongValue,
                    correctValue: topCorrection.correctValue,
                    occurrences: topCorrection.occurrences,
                });
                this.contexts.set(sourceId, context);
                logger_js_1.logger.info('Learned correction rule', {
                    sourceId,
                    field,
                    pattern: `${topCorrection.wrongValue} -> ${topCorrection.correctValue}`,
                });
            }
        }
    }
    /**
     * Apply learned corrections to a fusion result
     */
    applyLearnedCorrections(result) {
        const corrected = { ...result.fusedRecord };
        const appliedCorrections = [];
        for (const sourceId of result.lineage.sources) {
            const context = this.contexts.get(sourceId);
            if (!context)
                continue;
            for (const correction of context.corrections) {
                if (corrected[correction.field] === correction.wrongValue) {
                    corrected[correction.field] = correction.correctValue;
                    appliedCorrections.push(`${correction.field}: ${String(correction.wrongValue)} -> ${String(correction.correctValue)}`);
                }
            }
        }
        if (appliedCorrections.length > 0) {
            logger_js_1.logger.info('Applied learned corrections', {
                fusionId: result.id,
                corrections: appliedCorrections,
            });
            return {
                ...result,
                fusedRecord: corrected,
                lineage: {
                    ...result.lineage,
                    transformations: [
                        ...result.lineage.transformations,
                        `learned_corrections:${appliedCorrections.length}`,
                    ],
                },
            };
        }
        return result;
    }
    /**
     * Get or create learning context for a source
     */
    getOrCreateContext(sourceId) {
        let context = this.contexts.get(sourceId);
        if (!context) {
            context = {
                sourceId,
                fusionRules: [],
                corrections: [],
                userPreferences: {},
            };
        }
        return context;
    }
    /**
     * Record user preference
     */
    recordPreference(sourceId, preferenceKey, value) {
        const context = this.getOrCreateContext(sourceId);
        context.userPreferences[preferenceKey] = value;
        this.contexts.set(sourceId, context);
        logger_js_1.logger.info('Preference recorded', { sourceId, preferenceKey });
    }
    /**
     * Get user preference
     */
    getPreference(sourceId, preferenceKey) {
        const context = this.contexts.get(sourceId);
        return context?.userPreferences[preferenceKey];
    }
    /**
     * Get learning context for a source
     */
    getContext(sourceId) {
        return this.contexts.get(sourceId);
    }
    /**
     * Get all feedback for a target
     */
    getFeedback(targetId) {
        return this.feedback.get(targetId) || [];
    }
    /**
     * Get feedback statistics
     */
    getStats() {
        let totalFeedback = 0;
        let correct = 0;
        let incorrect = 0;
        for (const feedbackList of this.feedback.values()) {
            totalFeedback += feedbackList.length;
            for (const f of feedbackList) {
                if (f.feedbackType === 'correct')
                    correct++;
                if (f.feedbackType === 'incorrect')
                    incorrect++;
            }
        }
        const totalRules = Array.from(this.contexts.values())
            .reduce((sum, c) => sum + c.fusionRules.length, 0);
        const totalCorrections = Array.from(this.contexts.values())
            .reduce((sum, c) => sum + c.corrections.length, 0);
        return {
            totalFeedback,
            correctFeedback: correct,
            incorrectFeedback: incorrect,
            accuracyRate: totalFeedback > 0 ? correct / totalFeedback : 0,
            learnedRules: totalRules,
            learnedCorrections: totalCorrections,
        };
    }
    /**
     * Export context for persistence
     */
    exportContexts() {
        const result = {};
        for (const [key, value] of this.contexts) {
            result[key] = value;
        }
        return result;
    }
    /**
     * Import contexts from storage
     */
    importContexts(data) {
        for (const [key, value] of Object.entries(data)) {
            this.contexts.set(key, value);
        }
        logger_js_1.logger.info('Imported learning contexts', { count: Object.keys(data).length });
    }
    /**
     * Decay old feedback (call periodically)
     */
    decayFeedback() {
        for (const context of this.contexts.values()) {
            for (const rule of context.fusionRules) {
                rule.confidence *= this.config.decayFactor;
            }
        }
    }
}
exports.ContextPersistence = ContextPersistence;
