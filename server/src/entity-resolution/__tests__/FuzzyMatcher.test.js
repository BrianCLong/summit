"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const FuzzyMatcher_js_1 = require("../engine/FuzzyMatcher.js");
(0, globals_1.describe)('FuzzyMatcher', () => {
    (0, globals_1.describe)('levenshteinSimilarity', () => {
        (0, globals_1.it)('should return 1 for identical strings', () => {
            (0, globals_1.expect)(FuzzyMatcher_js_1.FuzzyMatcher.levenshteinSimilarity('hello', 'hello')).toBe(1);
        });
        (0, globals_1.it)('should return 0 for completely different strings', () => {
            // Note: normalized strings. 'abc' and 'xyz' have distance 3. max length 3. 1 - 3/3 = 0.
            (0, globals_1.expect)(FuzzyMatcher_js_1.FuzzyMatcher.levenshteinSimilarity('abc', 'xyz')).toBe(0);
        });
        (0, globals_1.it)('should handle partial matches', () => {
            // 'kitten' vs 'sitten' distance is 1. max length 6. 1 - 1/6 = 0.833
            const sim = FuzzyMatcher_js_1.FuzzyMatcher.levenshteinSimilarity('kitten', 'sitten');
            (0, globals_1.expect)(sim).toBeCloseTo(0.833, 2);
        });
        (0, globals_1.it)('should normalize strings', () => {
            (0, globals_1.expect)(FuzzyMatcher_js_1.FuzzyMatcher.levenshteinSimilarity('Hello ', 'hello')).toBe(1);
        });
    });
    (0, globals_1.describe)('cosineSimilarity', () => {
        (0, globals_1.it)('should return 1 for identical token sets', () => {
            (0, globals_1.expect)(FuzzyMatcher_js_1.FuzzyMatcher.cosineSimilarity('hello world', 'world hello')).toBeCloseTo(1);
        });
        (0, globals_1.it)('should return 0 for no shared tokens', () => {
            (0, globals_1.expect)(FuzzyMatcher_js_1.FuzzyMatcher.cosineSimilarity('hello world', 'foo bar')).toBe(0);
        });
        (0, globals_1.it)('should handle partial overlap', () => {
            // A: "apple banana" B: "apple orange"
            // Tokens: apple, banana, orange
            // A: [1, 1, 0]
            // B: [1, 0, 1]
            // Dot: 1*1 = 1
            // MagA: sqrt(2), MagB: sqrt(2)
            // Sim: 1 / 2 = 0.5
            (0, globals_1.expect)(FuzzyMatcher_js_1.FuzzyMatcher.cosineSimilarity('apple banana', 'apple orange')).toBeCloseTo(0.5);
        });
    });
});
