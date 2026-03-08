"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_js_1 = require("../../platform/summitsight/engine.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('SLO Evaluation Engine', () => {
    const definitions = [
        {
            service: 'maestro-api',
            metric: 'latency',
            target: 500,
            type: 'LATENCY_P95',
            period: '1h'
        }
    ];
    const engine = new engine_js_1.SLOEvaluationEngine(definitions);
    (0, globals_1.test)('should pass compliance when latency is below target', () => {
        const event = engine.evaluate(300, 'maestro-api-latency');
        (0, globals_1.expect)(event.inCompliance).toBe(true);
    });
    (0, globals_1.test)('should fail compliance when latency is above target', () => {
        const event = engine.evaluate(600, 'maestro-api-latency');
        (0, globals_1.expect)(event.inCompliance).toBe(false);
    });
});
