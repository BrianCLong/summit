"use strict";
/**
 * Entity disambiguation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityDisambiguator = void 0;
class EntityDisambiguator {
    options;
    constructor(options = {}) {
        this.options = {
            contextWindow: options.contextWindow ?? 100,
            useCooccurrence: options.useCooccurrence ?? true,
            useSemanticSimilarity: options.useSemanticSimilarity ?? true,
            minConfidence: options.minConfidence ?? 0.7,
        };
    }
    /**
     * Disambiguate entities by grouping similar mentions
     */
    disambiguate(entities, text) {
        const clusters = [];
        // Group entities by normalized form
        const groups = this.groupEntities(entities);
        for (const [key, group] of groups) {
            if (group.length === 1) {
                clusters.push({
                    canonical: group[0],
                    mentions: group,
                    confidence: group[0].confidence,
                });
            }
            else {
                // Choose most representative entity as canonical
                const canonical = this.selectCanonical(group, text);
                const confidence = this.calculateClusterConfidence(group);
                clusters.push({
                    canonical,
                    mentions: group,
                    confidence,
                });
            }
        }
        return clusters.filter((c) => c.confidence >= this.options.minConfidence);
    }
    /**
     * Group entities by similarity
     */
    groupEntities(entities) {
        const groups = new Map();
        for (const entity of entities) {
            const key = this.normalizeEntityText(entity.text);
            const existing = groups.get(key) || [];
            existing.push(entity);
            groups.set(key, existing);
        }
        return groups;
    }
    /**
     * Select canonical entity from group
     */
    selectCanonical(entities, text) {
        // Prefer longer, more complete forms
        return entities.reduce((best, current) => {
            if (current.text.length > best.text.length) {
                return current;
            }
            if (current.confidence > best.confidence) {
                return current;
            }
            return best;
        });
    }
    /**
     * Calculate confidence for entity cluster
     */
    calculateClusterConfidence(entities) {
        if (entities.length === 0) {
            return 0;
        }
        const avgConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
        // Boost confidence if multiple mentions
        const boost = Math.min(entities.length * 0.05, 0.2);
        return Math.min(avgConfidence + boost, 1.0);
    }
    /**
     * Normalize entity text for comparison
     */
    normalizeEntityText(text) {
        return text
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .trim();
    }
    /**
     * Resolve entity ambiguity using context
     */
    resolveAmbiguity(entity, context, candidates) {
        if (candidates.length === 0) {
            return entity;
        }
        if (candidates.length === 1) {
            return candidates[0];
        }
        // Score each candidate based on context similarity
        const scores = candidates.map((candidate) => ({
            entity: candidate,
            score: this.contextSimilarity(entity, candidate, context),
        }));
        scores.sort((a, b) => b.score - a.score);
        return scores[0].entity;
    }
    /**
     * Calculate context similarity between entities
     */
    contextSimilarity(entity1, entity2, context) {
        // Simplified context similarity
        // In production, use embeddings or more sophisticated methods
        const context1 = this.getContext(entity1, context);
        const context2 = this.getContext(entity2, context);
        const words1 = new Set(context1.toLowerCase().split(/\s+/));
        const words2 = new Set(context2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter((w) => words2.has(w)));
        return intersection.size / Math.max(words1.size, words2.size);
    }
    /**
     * Get context window around entity
     */
    getContext(entity, fullText) {
        const start = Math.max(0, entity.start - this.options.contextWindow);
        const end = Math.min(fullText.length, entity.end + this.options.contextWindow);
        return fullText.substring(start, end);
    }
}
exports.EntityDisambiguator = EntityDisambiguator;
