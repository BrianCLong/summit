"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SummitMLPipeline_js_1 = require("../SummitMLPipeline.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('SummitMLPipeline', () => {
    (0, globals_1.it)('should classify a military entity correctly', async () => {
        const entity = {
            name: 'Alpha Platoon',
            content: 'Troop movements near the border.'
        };
        const result = await SummitMLPipeline_js_1.summitMLPipeline.classifyEntity(entity);
        (0, globals_1.expect)(result.type).toBe('MILITARY_UNIT');
        (0, globals_1.expect)(result.tags).toContain('armed_forces');
        (0, globals_1.expect)(result.confidence).toBeGreaterThan(0.8);
    });
    (0, globals_1.it)('should classify a bot entity correctly', async () => {
        const entity = {
            name: 'Bot_123',
            content: 'Automated script running repeatedly.'
        };
        const result = await SummitMLPipeline_js_1.summitMLPipeline.classifyEntity(entity);
        (0, globals_1.expect)(result.type).toBe('AUTOMATED_ACTOR');
        (0, globals_1.expect)(result.tags).toContain('botnet');
    });
    (0, globals_1.it)('should calculate threat score correctly for high risk entity', async () => {
        const entity = {
            name: 'Bad Actor',
            content: 'Troops and tanks moving.', // Triggers MILITARY_UNIT
            history: [
                { severity: 'HIGH', date: '2023-01-01' },
                { severity: 'HIGH', date: '2023-02-01' }
            ]
        };
        const result = await SummitMLPipeline_js_1.summitMLPipeline.calculateThreatScore(entity);
        (0, globals_1.expect)(result.score).toBeGreaterThan(50); // Base 50 for military + 20 for history
        (0, globals_1.expect)(result.factors).toContain('History of 2 high-severity incidents');
    });
    (0, globals_1.it)('should predict increasing risk trend', async () => {
        const entity = {
            name: 'Escalating Situation',
            content: 'Military buildup.',
            history: [
                { severityValue: 10, date: '2023-01-01' },
                { severityValue: 20, date: '2023-02-01' },
                { severityValue: 50, date: '2023-03-01' } // Significant increase
            ]
        };
        const result = await SummitMLPipeline_js_1.summitMLPipeline.predictFutureRisks(entity);
        (0, globals_1.expect)(result.trend).toBe('INCREASING');
        (0, globals_1.expect)(result.predictedThreatLevel).toBeGreaterThan(50);
        (0, globals_1.expect)(result.nextLikelyEvent).toBe('Mobilization or deployment to new sector');
    });
});
