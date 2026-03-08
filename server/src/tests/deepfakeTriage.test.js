"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deepfakeTriage_js_1 = require("../ai/deepfakeTriage.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('deepfake triage', () => {
    (0, globals_1.it)('returns score, facets, and latency', () => {
        const result = (0, deepfakeTriage_js_1.deepfakeTriage)(Buffer.from('test'));
        (0, globals_1.expect)(result.score).toBeGreaterThanOrEqual(0);
        (0, globals_1.expect)(result.score).toBeLessThanOrEqual(100);
        (0, globals_1.expect)(Array.isArray(result.facets)).toBe(true);
        (0, globals_1.expect)(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
});
