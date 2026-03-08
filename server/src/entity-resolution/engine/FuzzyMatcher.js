"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FuzzyMatcher = void 0;
const natural_1 = __importDefault(require("natural"));
const StringNormalizer_js_1 = require("../utils/StringNormalizer.js");
class FuzzyMatcher {
    /**
     * Calculates Levenshtein distance similarity (0 to 1).
     * 1 means identical, 0 means completely different.
     */
    static levenshteinSimilarity(s1, s2) {
        const norm1 = StringNormalizer_js_1.StringNormalizer.normalize(s1);
        const norm2 = StringNormalizer_js_1.StringNormalizer.normalize(s2);
        if (norm1 === norm2)
            return 1.0;
        if (norm1.length === 0 || norm2.length === 0)
            return 0.0;
        const distance = natural_1.default.LevenshteinDistance(norm1, norm2);
        const maxLength = Math.max(norm1.length, norm2.length);
        return 1.0 - (distance / maxLength);
    }
    /**
     * Calculates Jaro-Winkler similarity (0 to 1).
     */
    static jaroWinklerSimilarity(s1, s2) {
        const norm1 = StringNormalizer_js_1.StringNormalizer.normalize(s1);
        const norm2 = StringNormalizer_js_1.StringNormalizer.normalize(s2);
        if (norm1 === norm2)
            return 1.0;
        if (norm1.length === 0 || norm2.length === 0)
            return 0.0;
        // @ts-ignore - natural types might be strict about options
        return natural_1.default.JaroWinklerDistance(norm1, norm2, undefined);
    }
    /**
     * Calculates Cosine similarity based on token frequency.
     */
    static cosineSimilarity(s1, s2) {
        const norm1 = StringNormalizer_js_1.StringNormalizer.normalize(s1);
        const norm2 = StringNormalizer_js_1.StringNormalizer.normalize(s2);
        if (norm1 === norm2)
            return 1.0;
        if (norm1.length === 0 || norm2.length === 0)
            return 0.0;
        const tokens1 = this.tokenize(norm1);
        const tokens2 = this.tokenize(norm2);
        const vector1 = this.getFrequencyVector(tokens1);
        const vector2 = this.getFrequencyVector(tokens2);
        const allTokens = new Set([...Object.keys(vector1), ...Object.keys(vector2)]);
        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;
        for (const token of allTokens) {
            const v1 = vector1[token] || 0;
            const v2 = vector2[token] || 0;
            dotProduct += v1 * v2;
            magnitude1 += v1 * v1;
            magnitude2 += v2 * v2;
        }
        if (magnitude1 === 0 || magnitude2 === 0)
            return 0;
        return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
    }
    /**
     * Calculates Token Jaccard Similarity.
     * Intersection over Union of tokens.
     */
    static tokenJaccardSimilarity(s1, s2) {
        const norm1 = StringNormalizer_js_1.StringNormalizer.normalize(s1);
        const norm2 = StringNormalizer_js_1.StringNormalizer.normalize(s2);
        const tokens1 = new Set(this.tokenize(norm1));
        const tokens2 = new Set(this.tokenize(norm2));
        if (tokens1.size === 0 && tokens2.size === 0)
            return 1.0;
        if (tokens1.size === 0 || tokens2.size === 0)
            return 0.0;
        const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
        const union = new Set([...tokens1, ...tokens2]);
        return intersection.size / union.size;
    }
    static tokenize(text) {
        return text.split(/\s+/);
    }
    static getFrequencyVector(tokens) {
        const vector = {};
        for (const token of tokens) {
            vector[token] = (vector[token] || 0) + 1;
        }
        return vector;
    }
}
exports.FuzzyMatcher = FuzzyMatcher;
