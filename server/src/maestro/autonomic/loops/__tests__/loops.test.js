"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const reliability_loop_js_1 = require("../reliability-loop.js");
const cost_loop_js_1 = require("../cost-loop.js");
const types_js_1 = require("../../signals/types.js");
const types_js_2 = require("../../policy/types.js");
(0, globals_1.describe)('ReliabilityLoop', () => {
    let loop;
    (0, globals_1.beforeEach)(() => {
        loop = new reliability_loop_js_1.ReliabilityLoop();
    });
    (0, globals_1.it)('should plan throttling when budget is exhausted', async () => {
        const health = { system: { status: types_js_1.HealthStatus.HEALTHY } };
        const alerts = [{ id: '1', sloId: 's1', level: types_js_2.SLOAlertLevel.BUDGET_EXHAUSTED, message: 'Exhausted', timestamp: new Date(), metadata: {} }];
        await loop.monitor(health, alerts);
        const needAdaptation = await loop.analyze();
        (0, globals_1.expect)(needAdaptation).toBe(true);
        const plan = await loop.plan();
        (0, globals_1.expect)(plan).not.toBeNull();
        (0, globals_1.expect)(plan?.actions[0].type).toBe('THROTTLE_QUEUE');
    });
    (0, globals_1.it)('should plan degraded mode when system is critical', async () => {
        const health = { system: { status: types_js_1.HealthStatus.CRITICAL, metrics: {}, issues: [], lastUpdated: new Date() } };
        const alerts = [];
        await loop.monitor(health, alerts);
        const needAdaptation = await loop.analyze();
        (0, globals_1.expect)(needAdaptation).toBe(true);
        const plan = await loop.plan();
        (0, globals_1.expect)(plan?.actions[0].type).toBe('ENABLE_DEGRADED_MODE');
    });
});
(0, globals_1.describe)('CostOptimizationLoop', () => {
    let loop;
    (0, globals_1.beforeEach)(() => {
        loop = new cost_loop_js_1.CostOptimizationLoop();
    });
    (0, globals_1.it)('should switch models when over budget', async () => {
        const health = {
            system: {
                metrics: { 'cost_spend_24h': 95 }, // 95 > 90
                status: types_js_1.HealthStatus.HEALTHY
            }
        };
        await loop.monitor(health, []);
        const needAdaptation = await loop.analyze();
        (0, globals_1.expect)(needAdaptation).toBe(true);
        const plan = await loop.plan();
        (0, globals_1.expect)(plan?.actions[0].type).toBe('SWITCH_MODEL_PROVIDER');
    });
});
