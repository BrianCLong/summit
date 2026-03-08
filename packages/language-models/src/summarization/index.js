"use strict";
/**
 * Text summarization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Summarizer = void 0;
class Summarizer {
    /**
     * Extractive summarization
     */
    async extractive(text, maxSentences = 3) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const summary = sentences.slice(0, maxSentences).join(' ');
        return {
            summary,
            type: 'extractive',
            compressionRatio: summary.length / text.length,
        };
    }
    /**
     * Abstractive summarization
     */
    async abstractive(text, maxLength = 150) {
        // Simplified abstractive summarization
        // In production, use transformer-based models
        const extractiveResult = await this.extractive(text, 2);
        return {
            ...extractiveResult,
            type: 'abstractive',
        };
    }
    /**
     * Bullet point summarization
     */
    async bulletPoints(text, maxPoints = 5) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        return sentences.slice(0, maxPoints).map((s) => s.trim());
    }
    /**
     * Multi-document summarization
     */
    async multiDocument(documents, maxLength = 300) {
        const combined = documents.join(' ');
        return this.abstractive(combined, maxLength);
    }
}
exports.Summarizer = Summarizer;
