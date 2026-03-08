"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AnomalyDetector_js_1 = require("../AnomalyDetector.js");
(0, globals_1.describe)('AnomalyDetector', () => {
    (0, globals_1.describe)('Z-Score', () => {
        (0, globals_1.it)('should detect spike using Z-Score', () => {
            const history = [
                { timestamp: 1, value: 10 },
                { timestamp: 2, value: 10 },
                { timestamp: 3, value: 11 },
                { timestamp: 4, value: 10 },
                { timestamp: 5, value: 10 },
                { timestamp: 6, value: 10 },
            ];
            // Mean approx 10.16, StdDev small
            // Inject spike: 50
            const anomaly = AnomalyDetector_js_1.AnomalyDetector.detectZScore('test_metric', history, 50);
            (0, globals_1.expect)(anomaly).not.toBeNull();
            (0, globals_1.expect)(anomaly.value).toBe(50);
            (0, globals_1.expect)(anomaly.score).toBeGreaterThan(3);
        });
        (0, globals_1.it)('should not detect normal variance', () => {
            const history = [
                { timestamp: 1, value: 10 },
                { timestamp: 2, value: 12 },
                { timestamp: 3, value: 8 },
                { timestamp: 4, value: 10 },
                { timestamp: 5, value: 11 },
            ];
            const anomaly = AnomalyDetector_js_1.AnomalyDetector.detectZScore('test_metric', history, 11);
            (0, globals_1.expect)(anomaly).toBeNull();
        });
    });
    (0, globals_1.describe)('MAD', () => {
        (0, globals_1.it)('should be robust to outliers in history', () => {
            // To demonstrate MAD robustness, we need enough data.
            // Values: 10, 10, 10, 10, 10, 100.
            // Median: 10.
            // Residuals: 0, 0, 0, 0, 0, 90.
            // MAD (Median of Residuals): 0.
            // If MAD is 0, our implementation returns null to avoid div by zero.
            // We need slightly noisy data so MAD is not 0.
            const history = [
                { timestamp: 1, value: 10 },
                { timestamp: 2, value: 11 },
                { timestamp: 3, value: 9 },
                { timestamp: 4, value: 100 }, // Outlier
                { timestamp: 5, value: 10 },
                { timestamp: 6, value: 11 },
            ];
            // Values sorted: 9, 10, 10, 11, 11, 100
            // Median: (10+11)/2 = 10.5
            // Residuals: 1.5, 0.5, 0.5, 0.5, 0.5, 89.5
            // Residuals sorted: 0.5, 0.5, 0.5, 0.5, 1.5, 89.5
            // MAD (Median of residuals): (0.5+0.5)/2 = 0.5
            // Current value: 50
            // Deviation from Median: |50 - 10.5| = 39.5
            // Modified Z = 0.6745 * 39.5 / 0.5 = 53.28
            // Should be > 3 (threshold)
            const anomaly = AnomalyDetector_js_1.AnomalyDetector.detectMAD('test_mad', history, 50);
            (0, globals_1.expect)(anomaly).not.toBeNull();
            (0, globals_1.expect)(anomaly.reason).toContain('MAD');
        });
    });
    (0, globals_1.describe)('Ratio', () => {
        (0, globals_1.it)('should detect sudden ratio change', () => {
            const history = [
                { timestamp: 1, value: 100 },
            ];
            // Jump to 300 (3x)
            const anomaly = AnomalyDetector_js_1.AnomalyDetector.detectRatio('test_ratio', history, 300, 2.0);
            (0, globals_1.expect)(anomaly).not.toBeNull();
            (0, globals_1.expect)(anomaly.score).toBe(3);
        });
    });
});
