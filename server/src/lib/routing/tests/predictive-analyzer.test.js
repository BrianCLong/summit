"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const predictive_analyzer_js_1 = __importDefault(require("../predictive-analyzer.js"));
(0, globals_1.describe)('PredictiveAnalyzer', () => {
    let analyzer;
    (0, globals_1.beforeEach)(() => {
        analyzer = predictive_analyzer_js_1.default;
    });
    test('should analyze trends correctly', () => {
        const increasingData = [{ timestamp: 1, value: 10 }, { timestamp: 2, value: 20 }];
        const decreasingData = [{ timestamp: 1, value: 20 }, { timestamp: 2, value: 10 }];
        const stableData = [{ timestamp: 1, value: 10 }, { timestamp: 2, value: 12 }];
        (0, globals_1.expect)(analyzer.analyzeTrend(increasingData)).toBe('increasing');
        (0, globals_1.expect)(analyzer.analyzeTrend(decreasingData)).toBe('decreasing');
        (0, globals_1.expect)(analyzer.analyzeTrend(stableData)).toBe('stable');
    });
    test('should predict spikes', () => {
        const spikeData = [{ timestamp: 1, value: 10 }, { timestamp: 2, value: 20 }, { timestamp: 3, value: 50 }];
        const noSpikeData = [{ timestamp: 1, value: 10 }, { timestamp: 2, value: 12 }, { timestamp: 3, value: 15 }];
        (0, globals_1.expect)(analyzer.predictSpike(spikeData)).toBe(true);
        (0, globals_1.expect)(analyzer.predictSpike(noSpikeData)).toBe(false);
    });
    test('should detect anomalies', () => {
        const anomalyData = [
            { timestamp: 1, value: 10 },
            { timestamp: 2, value: 12 },
            { timestamp: 3, value: 11 },
            { timestamp: 4, value: 9 },
            { timestamp: 5, value: 100 }, // Anomaly
        ];
        const noAnomalyData = [
            { timestamp: 1, value: 10 },
            { timestamp: 2, value: 12 },
            { timestamp: 3, value: 11 },
            { timestamp: 4, value: 9 },
            { timestamp: 5, value: 13 },
        ];
        (0, globals_1.expect)(analyzer.detectAnomaly(anomalyData)).toEqual({ timestamp: 5, value: 100 });
        (0, globals_1.expect)(analyzer.detectAnomaly(noAnomalyData)).toBe(null);
    });
});
