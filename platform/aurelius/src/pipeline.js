"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdeaExtractionPipeline = void 0;
const crypto_1 = require("crypto");
class IdeaExtractionPipeline {
    extractConcepts(text) {
        // Deterministic mock
        const keywords = text.split(' ').filter(w => w.length > 5);
        return keywords.map(k => ({
            id: (0, crypto_1.randomUUID)(),
            keyword: k,
            category: 'GENERATED'
        }));
    }
    calculateNovelty(text, priorArt) {
        // Mock similarity: if text contains "blockchain", low novelty
        if (text.toLowerCase().includes('blockchain'))
            return 0.2;
        return 0.85; // High default
    }
    draftPackage(title, abstract) {
        const concepts = this.extractConcepts(abstract);
        const score = this.calculateNovelty(abstract, []);
        return {
            id: (0, crypto_1.randomUUID)(),
            title,
            abstract,
            concepts,
            noveltyScore: score,
            claims: [
                `A method for ${title} comprising step A.`,
                `The method of claim 1 wherein step A includes ${concepts[0]?.keyword || 'processing'}.`,
                `A system configured to perform the method of claim 1.`
            ]
        };
    }
}
exports.IdeaExtractionPipeline = IdeaExtractionPipeline;
