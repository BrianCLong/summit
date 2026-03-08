"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const analytics_service_js_1 = require("../analytics-service.js");
(0, globals_1.describe)('Simulation Analytics (Task #113)', () => {
    (0, globals_1.it)('should aggregate momentum history across ticks', () => {
        const mockState = {
            id: 'sim-1',
            tick: 1,
            startedAt: new Date('2026-01-01T00:00:00Z'),
            tickIntervalMinutes: 60,
            entities: {
                'e1': {
                    id: 'e1',
                    name: 'Entity 1',
                    themes: { 'Security': 0.8 },
                    history: [
                        { tick: 0, sentiment: 0.5, influence: 100 },
                        { tick: 1, sentiment: 0.2, influence: 120 }
                    ]
                }
            },
            parameters: {
                'stability': {
                    name: 'stability',
                    history: [
                        { tick: 0, value: 0.9 },
                        { tick: 1, value: 0.7 }
                    ]
                }
            }
        };
        const history = analytics_service_js_1.simulationAnalyticsService.getMomentumHistory(mockState);
        (0, globals_1.expect)(history).toHaveLength(2);
        (0, globals_1.expect)(history[0].tick).toBe(0);
        (0, globals_1.expect)(history[1].tick).toBe(1);
        // Check momentum calculation (weight * influence)
        (0, globals_1.expect)(history[0].themeMomenta['Security']).toBe(80);
        (0, globals_1.expect)(history[1].themeMomenta['Security']).toBe(96);
        // Check sentiment averaging
        (0, globals_1.expect)(history[0].avgSentiment).toBe(0.5);
        (0, globals_1.expect)(history[1].avgSentiment).toBe(0.2);
        // Check parameters
        (0, globals_1.expect)(history[0].parameters['stability']).toBe(0.9);
        (0, globals_1.expect)(history[1].parameters['stability']).toBe(0.7);
    });
});
