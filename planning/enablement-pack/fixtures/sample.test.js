"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest"); // or jest
// Sample Typescript Test Fixture
(0, vitest_1.describe)('Smoke Test (TS)', () => {
    (0, vitest_1.it)('should add numbers correctly', () => {
        const sum = (a, b) => a + b;
        (0, vitest_1.expect)(sum(1, 2)).toBe(3);
    });
    (0, vitest_1.it)('should handle async operations', async () => {
        const asyncSum = (a, b) => Promise.resolve(a + b);
        (0, vitest_1.expect)(await asyncSum(2, 3)).toBe(5);
    });
});
