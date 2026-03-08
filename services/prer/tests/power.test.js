"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const power_js_1 = require("../src/power.js");
(0, vitest_1.describe)('power calculations', () => {
    (0, vitest_1.it)('matches analytical baseline for two-proportion test', () => {
        const result = (0, power_js_1.calculatePowerForMetric)({
            name: 'activation_rate',
            baselineRate: 0.1,
            minDetectableEffect: 0.02
        }, {
            method: 'difference-in-proportions',
            alpha: 0.05,
            desiredPower: 0.8
        });
        // Analytical calculators report ~3841 samples per variant for these parameters.
        (0, vitest_1.expect)(result.variantSampleSize).toBe(3841);
        (0, vitest_1.expect)(result.totalSampleSize).toBe(7682);
    });
});
