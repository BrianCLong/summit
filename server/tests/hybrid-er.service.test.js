"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const HybridEntityResolutionService_js_1 = require("../src/services/HybridEntityResolutionService.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('HybridEntityResolutionService', () => {
    (0, globals_1.it)('returns deterministic results', async () => {
        const a = 'Jon Smith';
        const b = 'John Smith';
        const r1 = await (0, HybridEntityResolutionService_js_1.resolveEntities)(a, b);
        const r2 = await (0, HybridEntityResolutionService_js_1.resolveEntities)(a, b);
        (0, globals_1.expect)(r1.score).toBeCloseTo(r2.score, 5);
        (0, globals_1.expect)(r1.match).toBe(r2.match);
        (0, globals_1.expect)(r1.explanation).toEqual(r2.explanation);
    });
});
