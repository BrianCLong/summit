"use strict";
/**
 * Entity confidence scoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceScorer = void 0;
class ConfidenceScorer {
    /**
     * Calculate confidence score for an entity
     */
    score(entity, context) {
        let score = entity.confidence;
        // Adjust based on entity characteristics
        score *= this.contextScore(entity, context);
        score *= this.frequencyScore(entity, context);
        score *= this.lengthScore(entity);
        return Math.min(Math.max(score, 0), 1);
    }
    /**
     * Score based on context
     */
    contextScore(entity, context) {
        // Check if entity appears in a strong context
        const strongIndicators = ['said', 'announced', 'reported', 'CEO', 'President'];
        const hasStrongContext = strongIndicators.some((indicator) => context.toLowerCase().includes(indicator.toLowerCase()));
        return hasStrongContext ? 1.2 : 1.0;
    }
    /**
     * Score based on frequency
     */
    frequencyScore(entity, context) {
        const pattern = new RegExp(entity.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = context.match(pattern);
        const frequency = matches ? matches.length : 0;
        if (frequency >= 3) {
            return 1.2;
        }
        if (frequency === 2) {
            return 1.1;
        }
        return 1.0;
    }
    /**
     * Score based on entity length
     */
    lengthScore(entity) {
        const words = entity.text.split(/\s+/).length;
        if (words >= 3) {
            return 1.1;
        }
        if (words === 1) {
            return 0.9;
        }
        return 1.0;
    }
}
exports.ConfidenceScorer = ConfidenceScorer;
