"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RiskEngine_js_1 = require("../risk/RiskEngine.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('RiskEngine', () => {
    (0, globals_1.it)('scores features with bands', () => {
        const engine = new RiskEngine_js_1.RiskEngine({ a: 1 }, 0);
        const res = engine.score({ a: 1 }, '7d');
        (0, globals_1.expect)(res.band).toBeDefined();
        (0, globals_1.expect)(res.contributions[0].delta).toBe(1);
    });
});
