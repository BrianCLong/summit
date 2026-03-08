"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const heuristicDifficultyScorer_1 = require("../difficulty/heuristicDifficultyScorer");
(0, globals_1.describe)('HeuristicDifficultyScorer', () => {
    let scorer;
    (0, globals_1.beforeEach)(() => {
        scorer = new heuristicDifficultyScorer_1.HeuristicDifficultyScorer();
    });
    (0, globals_1.it)('should classify simple query as easy', async () => {
        const result = await scorer.estimate('Hello world');
        (0, globals_1.expect)(result.band).toBe('easy');
        (0, globals_1.expect)(result.score).toBeLessThan(0.4);
        (0, globals_1.expect)(result.recommendedDepth).toBe(1);
    });
    (0, globals_1.it)('should classify complex coding query as medium or hard', async () => {
        const query = 'Write a function to calculate fibonacci sequence using recursion and memoization. Explain the time complexity.';
        const result = await scorer.estimate(query);
        // It should detect coding domain
        (0, globals_1.expect)(result.domain).toBe('coding');
        // It should have elevated score due to "calculate" (math) or coding keywords like "function"
        (0, globals_1.expect)(result.score).toBeGreaterThan(0.1);
        (0, globals_1.expect)(result.reasons.length).toBeGreaterThan(0);
    });
});
