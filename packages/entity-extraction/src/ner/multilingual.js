"use strict";
/**
 * Multi-language NER support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultilingualNER = void 0;
const index_1 = require("./index");
class MultilingualNER {
    extractors = new Map();
    /**
     * Extract entities from text in multiple languages
     */
    extract(text, language) {
        let extractor = this.extractors.get(language);
        if (!extractor) {
            extractor = new index_1.NERExtractor({ language });
            this.extractors.set(language, extractor);
        }
        return extractor.extract(text);
    }
    /**
     * Extract entities with automatic language detection
     */
    async extractAuto(text) {
        const language = await this.detectLanguage(text);
        return this.extract(text, language);
    }
    /**
     * Detect language (simplified)
     */
    async detectLanguage(text) {
        // Simplified language detection
        // In production, use @intelgraph/nlp language detection
        return 'en';
    }
}
exports.MultilingualNER = MultilingualNER;
