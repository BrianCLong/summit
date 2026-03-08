"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PredictiveThreatService_js_1 = require("../services/PredictiveThreatService.js");
(0, globals_1.describe)('PredictiveThreatService', () => {
    (0, globals_1.describe)('forecastSignal', () => {
        (0, globals_1.it)('should return a forecast with correct structure for a known signal', async () => {
            const result = await PredictiveThreatService_js_1.predictiveThreatService.forecastSignal('threat_events', 24);
            (0, globals_1.expect)(result).toHaveProperty('signal', 'threat_events');
            (0, globals_1.expect)(result).toHaveProperty('horizon', '24h');
            (0, globals_1.expect)(result.points).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.points.length).toBeGreaterThan(0);
            const forecastPoint = result.points.find(p => p.isForecast);
            (0, globals_1.expect)(forecastPoint).toBeDefined();
            if (forecastPoint) {
                (0, globals_1.expect)(forecastPoint).toHaveProperty('value');
                (0, globals_1.expect)(forecastPoint).toHaveProperty('confidenceLow');
                (0, globals_1.expect)(forecastPoint).toHaveProperty('confidenceHigh');
            }
        });
        (0, globals_1.it)('should throw error for unknown signal', async () => {
            await (0, globals_1.expect)(PredictiveThreatService_js_1.predictiveThreatService.forecastSignal('unknown_signal'))
                .rejects.toThrow('No historical data');
        });
    });
    (0, globals_1.describe)('simulateCounterfactual', () => {
        (0, globals_1.it)('should return a simulation result with impact calculation', async () => {
            const scenario = { action: 'mitigate', impactFactor: -0.5 };
            const result = await PredictiveThreatService_js_1.predictiveThreatService.simulateCounterfactual('threat_events', scenario);
            (0, globals_1.expect)(result).toHaveProperty('scenarioId');
            (0, globals_1.expect)(result).toHaveProperty('originalForecast');
            (0, globals_1.expect)(result).toHaveProperty('adjustedForecast');
            (0, globals_1.expect)(result.impact).toHaveProperty('percentageChange');
            // Check if impact was applied correctly (approximate check)
            // Since factor is -0.5, forecast values should be roughly halved
            const originalSum = result.originalForecast
                .filter(p => p.isForecast)
                .reduce((sum, p) => sum + p.value, 0);
            const adjustedSum = result.adjustedForecast
                .filter(p => p.isForecast)
                .reduce((sum, p) => sum + p.value, 0);
            // Allow for small floating point differences
            const expectedSum = originalSum * 0.5;
            (0, globals_1.expect)(adjustedSum).toBeCloseTo(expectedSum, 0);
            (0, globals_1.expect)(result.impact.percentageChange).toBeCloseTo(-50, 0);
        });
    });
});
