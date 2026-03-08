"use strict";
/**
 * Entity linking to knowledge bases
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityLinker = void 0;
class EntityLinker {
    cache = new Map();
    /**
     * Link entity to knowledge base
     */
    async link(entity, sources = ['wikidata']) {
        const cacheKey = `${entity.text}:${entity.type}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        const links = [];
        for (const source of sources) {
            const sourceLinks = await this.linkToSource(entity, source);
            links.push(...sourceLinks);
        }
        // Sort by confidence
        links.sort((a, b) => b.confidence - a.confidence);
        // Cache results
        if (this.cache.size < 10000) {
            this.cache.set(cacheKey, links);
        }
        return links;
    }
    /**
     * Link to specific knowledge base source
     */
    async linkToSource(entity, source) {
        // Simplified knowledge base linking
        // In production, integrate with Wikidata, DBpedia, etc.
        const links = [];
        if (source === 'wikidata') {
            // Mock Wikidata link
            links.push({
                entityId: `Q${Math.floor(Math.random() * 1000000)}`,
                entityName: entity.text,
                entityType: entity.type,
                source: 'wikidata',
                url: `https://www.wikidata.org/wiki/Q${Math.floor(Math.random() * 1000000)}`,
                confidence: 0.85,
                properties: {},
            });
        }
        return links;
    }
    /**
     * Disambiguate entity using knowledge base
     */
    async disambiguate(entity, context) {
        const links = await this.link(entity);
        if (links.length === 0) {
            return null;
        }
        if (links.length === 1) {
            return links[0];
        }
        // Use context to select best link
        const scores = links.map((link) => ({
            link,
            score: this.scoreWithContext(link, context),
        }));
        scores.sort((a, b) => b.score - a.score);
        return scores[0].link;
    }
    /**
     * Score link based on context
     */
    scoreWithContext(link, context) {
        let score = link.confidence;
        // Check if properties match context
        if (link.properties) {
            const contextWords = new Set(context.toLowerCase().split(/\s+/));
            for (const value of Object.values(link.properties)) {
                if (typeof value === 'string') {
                    const valueWords = value.toLowerCase().split(/\s+/);
                    const matches = valueWords.filter((w) => contextWords.has(w)).length;
                    score += matches * 0.05;
                }
            }
        }
        return Math.min(score, 1.0);
    }
    /**
     * Clear link cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Get entity properties from knowledge base
     */
    async getProperties(entityId, source) {
        // Simplified property retrieval
        // In production, query the actual knowledge base API
        return {
            id: entityId,
            source,
            retrieved: new Date().toISOString(),
        };
    }
}
exports.EntityLinker = EntityLinker;
