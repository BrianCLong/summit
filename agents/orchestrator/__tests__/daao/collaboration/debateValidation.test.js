"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const debateValidation_js_1 = require("../../../src/daao/collaboration/debateValidation.js");
(0, vitest_1.describe)('DebateValidator', () => {
    (0, vitest_1.it)('should refine draft if critique score is low', async () => {
        const mockRunner = {
            run: vitest_1.vi.fn()
                .mockResolvedValueOnce(JSON.stringify({
                issues: ['Too brief'],
                score: 0.5,
                safe: true
            })) // Critique
                .mockResolvedValueOnce("Refined Answer") // Refinement
        };
        const validator = new debateValidation_js_1.DebateValidator(mockRunner);
        const result = await validator.validate("Draft");
        (0, vitest_1.expect)(result.improved).toBe(true);
        (0, vitest_1.expect)(result.refined).toBe("Refined Answer");
        (0, vitest_1.expect)(mockRunner.run).toHaveBeenCalledTimes(2);
    });
    (0, vitest_1.it)('should not refine if critique score is high', async () => {
        const mockRunner = {
            run: vitest_1.vi.fn()
                .mockResolvedValueOnce(JSON.stringify({
                issues: [],
                score: 0.95,
                safe: true
            }))
        };
        const validator = new debateValidation_js_1.DebateValidator(mockRunner);
        const result = await validator.validate("Perfect Draft");
        (0, vitest_1.expect)(result.improved).toBe(false);
        (0, vitest_1.expect)(result.refined).toBe("Perfect Draft");
        (0, vitest_1.expect)(mockRunner.run).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)('should handle malformed JSON critique gracefully and still refine', async () => {
        const mockRunner = {
            run: vitest_1.vi.fn()
                .mockResolvedValueOnce("Not JSON") // Critique
                .mockResolvedValueOnce("Refined Answer") // Refinement
        };
        const validator = new debateValidation_js_1.DebateValidator(mockRunner);
        const result = await validator.validate("Draft");
        (0, vitest_1.expect)(result.parsedCritique).toBeUndefined();
        (0, vitest_1.expect)(result.improved).toBe(true); // Should refine because it couldn't verify quality
        (0, vitest_1.expect)(result.refined).toBe("Refined Answer");
    });
    (0, vitest_1.it)('should extract JSON from mixed content', async () => {
        const jsonBlock = JSON.stringify({ score: 0.5, safe: true });
        const mockRunner = {
            run: vitest_1.vi.fn()
                .mockResolvedValueOnce(`Here is the critique: ${jsonBlock} thanks.`) // Critique
                .mockResolvedValueOnce("Refined")
        };
        const validator = new debateValidation_js_1.DebateValidator(mockRunner);
        const result = await validator.validate("Draft");
        (0, vitest_1.expect)(result.parsedCritique).toBeDefined();
        (0, vitest_1.expect)(result.parsedCritique?.score).toBe(0.5);
    });
});
