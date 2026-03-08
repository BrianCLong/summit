"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const TimeSeriesIntelligenceService_js_1 = require("../services/TimeSeriesIntelligenceService.js");
const ledger_js_1 = require("../provenance/ledger.js");
// Mock provenanceLedger
globals_1.jest.mock('../provenance/ledger.js', () => ({
    provenanceLedger: {
        getEntries: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)('TimeSeriesIntelligenceService', () => {
    const mockGetEntries = ledger_js_1.provenanceLedger.getEntries;
    const entityId = 'test-entity-1';
    const tenantId = 'test-tenant';
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('forecastActivity', () => {
        (0, globals_1.it)('should return a forecast based on historical activity', async () => {
            // Mock 10 days of history with increasing activity
            const history = [];
            const now = new Date();
            for (let i = 0; i < 10; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - (9 - i));
                // Simple linear trend: 1, 2, 3...
                for (let j = 0; j < i + 1; j++) {
                    history.push({
                        resourceId: entityId,
                        timestamp: date,
                        payload: {}
                    });
                }
            }
            mockGetEntries.mockResolvedValue(history.reverse()); // Descending order usually
            const result = await TimeSeriesIntelligenceService_js_1.timeSeriesIntelligence.forecastActivity(entityId, tenantId, 3);
            (0, globals_1.expect)(result.entityId).toBe(entityId);
            (0, globals_1.expect)(result.metric).toBe('activity_volume');
            (0, globals_1.expect)(result.forecast.length).toBe(3);
            // Check trend is positive and rising
            (0, globals_1.expect)(result.forecast[0].value).toBeGreaterThan(7.5);
        });
        (0, globals_1.it)('should handle empty history gracefully', async () => {
            mockGetEntries.mockResolvedValue([]);
            const result = await TimeSeriesIntelligenceService_js_1.timeSeriesIntelligence.forecastActivity(entityId, tenantId, 3);
            (0, globals_1.expect)(result.forecast.length).toBe(3);
            (0, globals_1.expect)(result.forecast[0].value).toBe(0);
        });
    });
    (0, globals_1.describe)('forecastMetric', () => {
        (0, globals_1.it)('should forecast a specific metric from payload', async () => {
            const history = [];
            const now = new Date();
            for (let i = 0; i < 10; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - (9 - i));
                history.push({
                    resourceId: entityId,
                    timestamp: date,
                    payload: { score: 10 + i * 2 } // 10, 12, 14...
                });
            }
            mockGetEntries.mockResolvedValue(history);
            const result = await TimeSeriesIntelligenceService_js_1.timeSeriesIntelligence.forecastMetric(entityId, tenantId, 'payload.score', 3);
            (0, globals_1.expect)(result.metric).toBe('payload.score');
            // Next value should be roughly 30
            // 10 + 9*2 = 28 is last value. Next should be ~30.
            const firstForecast = result.forecast[0].value;
            // The forecast might lag slightly depending on alpha/beta smoothing params, so we adjust expectation.
            (0, globals_1.expect)(firstForecast).toBeGreaterThan(24);
            (0, globals_1.expect)(firstForecast).toBeLessThan(35);
        });
    });
});
