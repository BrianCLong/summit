"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const score_1 = require("../../src/services/score");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('computeScore', () => {
    (0, globals_1.it)('should compute the weighted mean correctly', () => {
        const values = [
            { v: 10, w: 1 },
            { v: 20, w: 2 },
            { v: 30, w: 1 },
        ];
        (0, globals_1.expect)((0, score_1.computeScore)(values)).toBe(20);
    });
    (0, globals_1.it)('should handle cases with no weight (default to 1)', () => {
        const values = [{ v: 10 }, { v: 20 }];
        (0, globals_1.expect)((0, score_1.computeScore)(values)).toBe(15);
    });
    (0, globals_1.it)('should return 0 if no values are provided', () => {
        const values = [];
        (0, globals_1.expect)((0, score_1.computeScore)(values)).toBe(0);
    });
    (0, globals_1.it)('should handle zero weights', () => {
        const values = [
            { v: 10, w: 0 },
            { v: 20, w: 0 },
        ];
        (0, globals_1.expect)((0, score_1.computeScore)(values)).toBe(0);
    });
    (0, globals_1.it)('should handle mixed weights and no weights', () => {
        const values = [{ v: 10, w: 0.5 }, { v: 20 }, { v: 30, w: 1.5 }];
        // (10*0.5 + 20*1 + 30*1.5) / (0.5 + 1 + 1.5) = (5 + 20 + 45) / 3 = 70 / 3 = 23.3333...
        (0, globals_1.expect)((0, score_1.computeScore)(values)).toBe(23.3333);
    });
});
