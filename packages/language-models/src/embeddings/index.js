"use strict";
/**
 * Text embeddings generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingGenerator = void 0;
class EmbeddingGenerator {
    modelName;
    dimension;
    constructor(modelName = 'bert-base-uncased', dimension = 768) {
        this.modelName = modelName;
        this.dimension = dimension;
    }
    /**
     * Generate embeddings for text
     */
    async encode(text) {
        // Simplified embedding generation
        // In production, use actual transformer models
        const vector = Array(this.dimension).fill(0).map(() => Math.random());
        return {
            vector,
            dimension: this.dimension,
            model: this.modelName,
        };
    }
    /**
     * Generate embeddings for multiple texts
     */
    async encodeBatch(texts) {
        return Promise.all(texts.map((text) => this.encode(text)));
    }
    /**
     * Generate sentence embeddings
     */
    async encodeSentence(sentence) {
        return this.encode(sentence);
    }
    /**
     * Calculate cosine similarity between embeddings
     */
    cosineSimilarity(emb1, emb2) {
        const dotProduct = emb1.vector.reduce((sum, val, idx) => sum + val * emb2.vector[idx], 0);
        const mag1 = Math.sqrt(emb1.vector.reduce((sum, val) => sum + val * val, 0));
        const mag2 = Math.sqrt(emb2.vector.reduce((sum, val) => sum + val * val, 0));
        return mag1 && mag2 ? dotProduct / (mag1 * mag2) : 0;
    }
}
exports.EmbeddingGenerator = EmbeddingGenerator;
