"use strict";
/**
 * Semantic search
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticSearch = void 0;
const embeddings_1 = require("../embeddings");
class SemanticSearch {
    embedder;
    index = new Map();
    constructor() {
        this.embedder = new embeddings_1.EmbeddingGenerator();
    }
    /**
     * Index documents for semantic search
     */
    async indexDocuments(documents) {
        for (const doc of documents) {
            const embedding = await this.embedder.encode(doc.text);
            this.index.set(doc.id, embedding.vector);
        }
    }
    /**
     * Search documents semantically
     */
    async search(query, documents, topK = 5) {
        const queryEmbedding = await this.embedder.encode(query);
        const results = documents.map((doc) => {
            const docVector = this.index.get(doc.id);
            const score = docVector
                ? this.calculateSimilarity(queryEmbedding.vector, docVector)
                : 0;
            return {
                documentId: doc.id,
                score,
                text: doc.text,
            };
        });
        return results.sort((a, b) => b.score - a.score).slice(0, topK);
    }
    /**
     * Calculate similarity between vectors
     */
    calculateSimilarity(vec1, vec2) {
        const dotProduct = vec1.reduce((sum, val, idx) => sum + val * vec2[idx], 0);
        const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
        const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
        return mag1 && mag2 ? dotProduct / (mag1 * mag2) : 0;
    }
}
exports.SemanticSearch = SemanticSearch;
