"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const debateValidation_1 = require("../collaboration/debateValidation");
(0, globals_1.describe)('DebateValidator', () => {
    let validator;
    let mockRunner;
    (0, globals_1.beforeEach)(() => {
        mockRunner = {
            run: globals_1.jest.fn()
        };
        validator = new debateValidation_1.DebateValidator(mockRunner);
    });
    (0, globals_1.it)('should refine if score is low', async () => {
        mockRunner.run
            .mockResolvedValueOnce(JSON.stringify({
            score: 0.5,
            strengths: [],
            weaknesses: ['Bad'],
            recommendations: 'Fix it'
        })) // Critic
            .mockResolvedValueOnce('Refined Solution'); // Refiner
        const result = await validator.validateAndRefine('Bad Solution');
        (0, globals_1.expect)(result.wasRefined).toBe(true);
        (0, globals_1.expect)(result.refined).toBe('Refined Solution');
        (0, globals_1.expect)(mockRunner.run).toHaveBeenCalledTimes(2);
    });
    (0, globals_1.it)('should skip refinement if score is high', async () => {
        mockRunner.run
            .mockResolvedValueOnce(JSON.stringify({
            score: 0.98,
            strengths: ['Great'],
            weaknesses: [],
            recommendations: 'None'
        })); // Critic
        const result = await validator.validateAndRefine('Good Solution');
        (0, globals_1.expect)(result.wasRefined).toBe(false);
        (0, globals_1.expect)(result.refined).toBe('Good Solution');
        (0, globals_1.expect)(mockRunner.run).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('should handle malformed JSON from critic', async () => {
        mockRunner.run
            .mockResolvedValueOnce('This is not JSON but a critique.') // Critic
            .mockResolvedValueOnce('Refined anyway'); // Refiner
        const result = await validator.validateAndRefine('Solution');
        (0, globals_1.expect)(result.wasRefined).toBe(true);
        (0, globals_1.expect)(result.critiqueParsed).toBeUndefined();
        (0, globals_1.expect)(result.refined).toBe('Refined anyway');
    });
});
