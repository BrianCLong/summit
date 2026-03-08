"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const governance_engine_js_1 = require("../governance-engine.js");
(0, globals_1.describe)('GovernanceEngine', () => {
    let engine;
    (0, globals_1.beforeEach)(() => {
        engine = new governance_engine_js_1.GovernanceEngine();
    });
    (0, globals_1.it)('should deny red-line actions', async () => {
        const plan = {
            id: 'p1',
            loopName: 'test',
            timestamp: new Date(),
            justification: 'test',
            actions: [{ type: 'DISABLE_SECURITY_SCANNERS', payload: {} }]
        };
        const results = await engine.reviewPlan(plan);
        (0, globals_1.expect)(results[0].status).toBe('DENIED');
        (0, globals_1.expect)(results[0].denialReason).toContain('Red Line');
    });
    (0, globals_1.it)('should approve safe actions', async () => {
        const plan = {
            id: 'p2',
            loopName: 'test',
            timestamp: new Date(),
            justification: 'test',
            actions: [{ type: 'THROTTLE_QUEUE', payload: { factor: 0.5 } }]
        };
        const results = await engine.reviewPlan(plan);
        (0, globals_1.expect)(results[0].status).toBe('APPROVED');
    });
    (0, globals_1.it)('should deny OPA violations', async () => {
        const plan = {
            id: 'p3',
            loopName: 'test',
            timestamp: new Date(),
            justification: 'test',
            actions: [{ type: 'RELAX_SAFETY_RULES', payload: { approved: false } }]
        };
        const results = await engine.reviewPlan(plan);
        (0, globals_1.expect)(results[0].status).toBe('DENIED');
    });
});
