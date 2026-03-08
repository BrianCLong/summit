"use strict";
/**
 * Spell checking and correction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.spelling = exports.SpellChecker = void 0;
class SpellChecker {
    options;
    dictionary = new Set();
    constructor(options = {}) {
        this.options = {
            autoCorrect: options.autoCorrect ?? false,
            suggestionsLimit: options.suggestionsLimit ?? 5,
            customDictionary: options.customDictionary ?? [],
            ignoreCase: options.ignoreCase ?? true,
            ignoreNumbers: options.ignoreNumbers ?? true,
        };
        this.loadDefaultDictionary();
        this.addWords(this.options.customDictionary);
    }
    /**
     * Check if a word is spelled correctly
     */
    check(word) {
        const normalized = this.options.ignoreCase ? word.toLowerCase() : word;
        // Ignore numbers if configured
        if (this.options.ignoreNumbers && /^\d+$/.test(word)) {
            return true;
        }
        return this.dictionary.has(normalized);
    }
    /**
     * Get spelling suggestions for a word
     */
    suggest(word) {
        if (this.check(word)) {
            return [word];
        }
        const suggestions = this.generateSuggestions(word);
        return suggestions.slice(0, this.options.suggestionsLimit);
    }
    /**
     * Correct a word automatically
     */
    correct(word) {
        if (!this.options.autoCorrect || this.check(word)) {
            return word;
        }
        const suggestions = this.suggest(word);
        return suggestions[0] || word;
    }
    /**
     * Check and correct an entire text
     */
    correctText(text) {
        if (!this.options.autoCorrect) {
            return text;
        }
        const words = text.match(/\w+/g) || [];
        let corrected = text;
        for (const word of words) {
            const correction = this.correct(word);
            if (correction !== word) {
                corrected = corrected.replace(new RegExp(`\\b${word}\\b`, 'g'), correction);
            }
        }
        return corrected;
    }
    /**
     * Add words to dictionary
     */
    addWords(words) {
        for (const word of words) {
            const normalized = this.options.ignoreCase ? word.toLowerCase() : word;
            this.dictionary.add(normalized);
        }
    }
    /**
     * Remove words from dictionary
     */
    removeWords(words) {
        for (const word of words) {
            const normalized = this.options.ignoreCase ? word.toLowerCase() : word;
            this.dictionary.delete(normalized);
        }
    }
    /**
     * Generate spelling suggestions using edit distance
     */
    generateSuggestions(word) {
        const suggestions = [];
        const normalized = this.options.ignoreCase ? word.toLowerCase() : word;
        // Check dictionary for similar words
        for (const dictWord of this.dictionary) {
            const distance = this.editDistance(normalized, dictWord);
            if (distance <= 2) {
                suggestions.push({ word: dictWord, distance });
            }
            // Limit processing for performance
            if (suggestions.length > 100) {
                break;
            }
        }
        // Sort by edit distance
        suggestions.sort((a, b) => a.distance - b.distance);
        return suggestions.map((s) => s.word);
    }
    /**
     * Calculate Levenshtein edit distance
     */
    editDistance(word1, word2) {
        const m = word1.length;
        const n = word2.length;
        const dp = Array(m + 1)
            .fill(null)
            .map(() => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) {
            dp[i][0] = i;
        }
        for (let j = 0; j <= n; j++) {
            dp[0][j] = j;
        }
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (word1[i - 1] === word2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                }
                else {
                    dp[i][j] = Math.min(dp[i - 1][j] + 1, // deletion
                    dp[i][j - 1] + 1, // insertion
                    dp[i - 1][j - 1] + 1 // substitution
                    );
                }
            }
        }
        return dp[m][n];
    }
    /**
     * Load default dictionary
     */
    loadDefaultDictionary() {
        // Load a basic dictionary (in production, load from a file or API)
        const commonWords = [
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
            'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
            'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
            'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
            // Add more common words as needed
        ];
        this.addWords(commonWords);
    }
    /**
     * Clear dictionary
     */
    clearDictionary() {
        this.dictionary.clear();
        this.loadDefaultDictionary();
    }
}
exports.SpellChecker = SpellChecker;
/**
 * Quick spelling utilities
 */
exports.spelling = {
    /**
     * Check if word is likely misspelled (simple heuristic)
     */
    isLikelyMisspelled(word) {
        // Check for repeated characters
        if (/(.)\1{2,}/.test(word)) {
            return true;
        }
        // Check for unusual character sequences
        if (/[qwrtpsdfghjklzxcvbnm]{5,}/i.test(word)) {
            return true;
        }
        return false;
    },
    /**
     * Calculate edit distance between two words
     */
    editDistance(word1, word2) {
        const m = word1.length;
        const n = word2.length;
        const dp = Array(m + 1)
            .fill(null)
            .map(() => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) {
            dp[i][0] = i;
        }
        for (let j = 0; j <= n; j++) {
            dp[0][j] = j;
        }
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (word1[i - 1] === word2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                }
                else {
                    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
                }
            }
        }
        return dp[m][n];
    },
};
