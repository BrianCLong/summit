"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const er_tuner_js_1 = require("../src/er-tuner.js");
(0, vitest_1.describe)('ER threshold tuner', () => {
    (0, vitest_1.it)('computes precision and recall per threshold', () => {
        const report = (0, er_tuner_js_1.buildThresholdReport)([
            { score: 0.95, isMatch: true },
            { score: 0.91, isMatch: true },
            { score: 0.82, isMatch: false },
            { score: 0.6, isMatch: true },
        ], [0.9, 0.8]);
        (0, vitest_1.expect)(report).toHaveLength(2);
        (0, vitest_1.expect)(report[0].precision).toBeGreaterThan(0.5);
        (0, vitest_1.expect)(report[1].recall).toBeGreaterThan(0);
    });
});
