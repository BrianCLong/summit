"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const heuristicDifficultyScorer_js_1 = require("../../../src/daao/difficulty/heuristicDifficultyScorer.js");
(0, vitest_1.describe)('HeuristicDifficultyScorer', () => {
    const scorer = new heuristicDifficultyScorer_js_1.HeuristicDifficultyScorer();
    (0, vitest_1.it)('should score short simple queries as easy', async () => {
        const result = await scorer.estimate("What is the capital of France?");
        (0, vitest_1.expect)(result.band).toBe("easy");
        (0, vitest_1.expect)(result.score).toBeLessThan(0.4);
        (0, vitest_1.expect)(result.recommendedDepth).toBe(1);
    });
    (0, vitest_1.it)('should score long queries as medium or hard', async () => {
        const longQuery = "A".repeat(501);
        const result = await scorer.estimate(longQuery);
        (0, vitest_1.expect)(result.score).toBeGreaterThan(0.4);
        (0, vitest_1.expect)(result.reasons).toContain("Query length > 500 chars");
    });
    (0, vitest_1.it)('should detect complexity keywords', async () => {
        const complexQuery = "Please analyze and evaluate the comprehensive architecture design of this system.";
        const result = await scorer.estimate(complexQuery);
        const hasComplexityReason = result.reasons.some(r => /found .* complexity keywords/.test(r));
        (0, vitest_1.expect)(hasComplexityReason).toBe(true);
        (0, vitest_1.expect)(result.score).toBeGreaterThan(0.2); // Base score
    });
    (0, vitest_1.it)('should detect code snippets', async () => {
        const codeQuery = "Here is a function: ```javascript function test() {} ```";
        const result = await scorer.estimate(codeQuery);
        (0, vitest_1.expect)(result.reasons).toContain("Contains code snippets");
        (0, vitest_1.expect)(result.score).toBeGreaterThan(0.2);
    });
    (0, vitest_1.it)('should clamp scores between 0 and 1', async () => {
        // Construct a query that triggers all heuristics to potentially exceed 1.0
        const ultraHard = "analyze evaluate design architecture strategy comprehensive " + "A".repeat(600) + " ```code```";
        const result = await scorer.estimate(ultraHard);
        (0, vitest_1.expect)(result.score).toBeLessThanOrEqual(1);
        (0, vitest_1.expect)(result.score).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(result.band).toBe("hard");
    });
});
