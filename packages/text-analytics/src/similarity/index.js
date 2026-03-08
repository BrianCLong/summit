"use strict";
/**
 * Text similarity and matching
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimilarityEngine = void 0;
class SimilarityEngine {
    /**
     * Cosine similarity
     */
    cosineSimilarity(text1, text2) {
        const vec1 = this.vectorize(text1);
        const vec2 = this.vectorize(text2);
        const dotProduct = this.dotProduct(vec1, vec2);
        const magnitude1 = Math.sqrt(this.dotProduct(vec1, vec1));
        const magnitude2 = Math.sqrt(this.dotProduct(vec2, vec2));
        return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
    }
    /**
     * Jaccard similarity
     */
    jaccardSimilarity(text1, text2) {
        const set1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
        const set2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);
        const intersection = new Set([...set1].filter((x) => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return union.size > 0 ? intersection.size / union.size : 0;
    }
    /**
     * Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) {
            dp[i][0] = i;
        }
        for (let j = 0; j <= n; j++) {
            dp[0][j] = j;
        }
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                }
                else {
                    dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
                }
            }
        }
        return dp[m][n];
    }
    /**
     * Fuzzy matching
     */
    fuzzyMatch(text, pattern, threshold = 0.8) {
        const distance = this.levenshteinDistance(text.toLowerCase(), pattern.toLowerCase());
        const maxLength = Math.max(text.length, pattern.length);
        const similarity = 1 - distance / maxLength;
        return similarity >= threshold;
    }
    /**
     * Vectorize text (TF-IDF style)
     */
    vectorize(text) {
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        const vector = new Map();
        for (const word of words) {
            vector.set(word, (vector.get(word) || 0) + 1);
        }
        return vector;
    }
    /**
     * Calculate dot product
     */
    dotProduct(vec1, vec2) {
        let product = 0;
        for (const [word, value1] of vec1) {
            const value2 = vec2.get(word) || 0;
            product += value1 * value2;
        }
        return product;
    }
}
exports.SimilarityEngine = SimilarityEngine;
__exportStar(require("./duplicate-detection"), exports);
__exportStar(require("./semantic"), exports);
