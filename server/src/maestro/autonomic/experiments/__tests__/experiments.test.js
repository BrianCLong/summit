"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const experimentation_service_js_1 = require("../experimentation-service.js");
(0, globals_1.describe)('ExperimentationService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new experimentation_service_js_1.ExperimentationService();
    });
    (0, globals_1.it)('should assign variants deterministically', () => {
        const exp = {
            id: 'exp-1',
            name: 'Test Exp',
            hypothesis: 'A is better',
            variants: [
                { id: 'A', trafficWeight: 50, configOverrides: {} },
                { id: 'B', trafficWeight: 50, configOverrides: {} }
            ],
            metrics: [],
            status: 'ACTIVE',
            startDate: new Date(),
            stopConditions: {}
        };
        service.createExperiment(exp);
        const user1 = 'user-123';
        const assign1 = service.getAssignment('exp-1', user1);
        const assign2 = service.getAssignment('exp-1', user1);
        (0, globals_1.expect)(assign1?.variantId).toBe(assign2?.variantId);
        (0, globals_1.expect)(['A', 'B']).toContain(assign1?.variantId);
    });
    (0, globals_1.it)('should stop experiment if condition met', () => {
        const exp = {
            id: 'exp-fail',
            name: 'Risky Exp',
            hypothesis: 'Maybe bad',
            variants: [],
            metrics: ['success_rate'],
            status: 'ACTIVE',
            startDate: new Date(),
            stopConditions: { 'success_rate': 0.9 } // Stop if below 0.9
        };
        service.createExperiment(exp);
        const stopped = service.checkStopConditions('exp-fail', { success_rate: 0.8 });
        (0, globals_1.expect)(stopped).toBe(true);
        (0, globals_1.expect)(exp.status).toBe('STOPPED');
    });
});
