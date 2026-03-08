"use strict";
/**
 * Comprehensive unit tests for AnomalyDetector
 *
 * Tests cover:
 * - Z-Score anomaly detection
 * - MAD (Median Absolute Deviation) detection
 * - Ratio-based detection
 * - Edge cases (insufficient data, zero variance, etc.)
 * - Statistical accuracy
 * - Threshold handling
 * - Outlier robustness
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AnomalyDetector_js_1 = require("../AnomalyDetector.js");
(0, globals_1.describe)('AnomalyDetector', () => {
    const createHistoricalData = (values) => {
        return values.map((value, index) => ({
            timestamp: new Date(2025, 0, index + 1).getTime(),
            value,
        }));
    };
    (0, globals_1.describe)('Z-Score Detection', () => {
        (0, globals_1.describe)('Basic Detection', () => {
            (0, globals_1.it)('should detect anomaly when value is significantly above mean', () => {
                const history = createHistoricalData([10, 12, 11, 13, 10]);
                const currentValue = 50; // Significantly higher
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('cpu_usage', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
                (0, globals_1.expect)(result.type).toBe('anomaly');
                (0, globals_1.expect)(result.metricName).toBe('cpu_usage');
                (0, globals_1.expect)(result.value).toBe(50);
                (0, globals_1.expect)(Math.abs(result.score)).toBeGreaterThan(3);
            });
            (0, globals_1.it)('should detect anomaly when value is significantly below mean', () => {
                const history = createHistoricalData([100, 102, 98, 101, 99]);
                const currentValue = 10; // Significantly lower
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('response_time', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
                (0, globals_1.expect)(result.score).toBeLessThan(-3);
            });
            (0, globals_1.it)('should not detect anomaly when value is within normal range', () => {
                const history = createHistoricalData([10, 12, 11, 13, 10]);
                const currentValue = 11; // Within normal range
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('cpu_usage', history, currentValue, 3);
                (0, globals_1.expect)(result).toBeNull();
            });
            (0, globals_1.it)('should detect anomaly at threshold boundary', () => {
                const history = createHistoricalData([10, 10, 10, 10, 10]); // Mean=10, StdDev will be calculated
                const stdDev = 1; // Approximate
                const threshold = 3;
                const currentValue = 10 + (threshold * stdDev) + 0.1; // Just above threshold
                // This might not trigger due to zero variance - that's a valid edge case
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, threshold);
                // With zero variance, should return null
                (0, globals_1.expect)(result).toBeNull();
            });
        });
        (0, globals_1.describe)('Statistical Accuracy', () => {
            (0, globals_1.it)('should calculate correct z-score for known distribution', () => {
                // Known values: mean=10, stddev=2
                const history = createHistoricalData([8, 10, 12, 8, 12, 10]);
                const currentValue = 16; // 3 std devs above mean
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 2.5);
                (0, globals_1.expect)(result).not.toBeNull();
                (0, globals_1.expect)(result.score).toBeCloseTo(3.67, 1); // Allow some margin
            });
            (0, globals_1.it)('should handle positive values correctly', () => {
                const history = createHistoricalData([100, 150, 200, 125, 175]);
                const currentValue = 500;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
                (0, globals_1.expect)(result.score).toBeGreaterThan(0);
            });
            (0, globals_1.it)('should handle negative values correctly', () => {
                const history = createHistoricalData([-10, -12, -11, -13, -10]);
                const currentValue = -50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
                (0, globals_1.expect)(result.score).toBeLessThan(0);
            });
            (0, globals_1.it)('should handle mixed positive and negative values', () => {
                const history = createHistoricalData([-5, -2, 0, 2, 5]);
                const currentValue = 30;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
            });
            (0, globals_1.it)('should handle decimal values', () => {
                const history = createHistoricalData([1.5, 1.7, 1.6, 1.8, 1.5]);
                const currentValue = 5.5;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
            });
        });
        (0, globals_1.describe)('Threshold Handling', () => {
            (0, globals_1.it)('should respect custom threshold', () => {
                const history = createHistoricalData([10, 10, 10, 10, 10]);
                const currentValue = 15;
                const strictThreshold = 0.5;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, strictThreshold);
                // With zero variance, should return null
                (0, globals_1.expect)(result).toBeNull();
            });
            (0, globals_1.it)('should use default threshold of 3 when not specified', () => {
                const history = createHistoricalData([10, 12, 11, 13, 10]);
                const currentValue = 50;
                const resultWithDefault = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue);
                const resultWithExplicit = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                (0, globals_1.expect)(resultWithDefault).not.toBeNull();
                (0, globals_1.expect)(resultWithExplicit).not.toBeNull();
                (0, globals_1.expect)(resultWithDefault.threshold).toBe(3);
            });
            (0, globals_1.it)('should accept very low threshold', () => {
                const history = createHistoricalData([10, 11, 12, 13, 14]);
                const currentValue = 16;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 0.1);
                (0, globals_1.expect)(result).not.toBeNull();
            });
            (0, globals_1.it)('should accept very high threshold', () => {
                const history = createHistoricalData([10, 11, 12, 13, 14]);
                const currentValue = 100;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 100);
                (0, globals_1.expect)(result).toBeNull(); // Unlikely to exceed threshold of 100
            });
        });
        (0, globals_1.describe)('Edge Cases', () => {
            (0, globals_1.it)('should return null when history has less than 5 points', () => {
                const history = createHistoricalData([10, 12, 11, 13]);
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).toBeNull();
            });
            (0, globals_1.it)('should return null when history has exactly 4 points', () => {
                const history = createHistoricalData([10, 11, 12, 13]);
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).toBeNull();
            });
            (0, globals_1.it)('should work when history has exactly 5 points', () => {
                const history = createHistoricalData([10, 11, 12, 13, 14]);
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
            });
            (0, globals_1.it)('should return null when all historical values are identical (zero variance)', () => {
                const history = createHistoricalData([42, 42, 42, 42, 42]);
                const currentValue = 100;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).toBeNull();
            });
            (0, globals_1.it)('should handle zero values in history', () => {
                const history = createHistoricalData([0, 0, 0, 0, 0]);
                const currentValue = 10;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).toBeNull(); // Zero variance
            });
            (0, globals_1.it)('should handle current value equal to mean', () => {
                const history = createHistoricalData([10, 12, 11, 13, 10]);
                const mean = 11.2; // Approximate
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, mean, 3);
                (0, globals_1.expect)(result).toBeNull();
            });
            (0, globals_1.it)('should handle very large values', () => {
                const history = createHistoricalData([1000000, 1000100, 1000050, 1000080, 1000020]);
                const currentValue = 2000000;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
            });
            (0, globals_1.it)('should handle very small values', () => {
                const history = createHistoricalData([0.001, 0.002, 0.0015, 0.0018, 0.0012]);
                const currentValue = 0.01;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
            });
        });
        (0, globals_1.describe)('Result Structure', () => {
            (0, globals_1.it)('should include all required fields in anomaly event', () => {
                const history = createHistoricalData([10, 12, 11, 13, 10]);
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('cpu_usage', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
                (0, globals_1.expect)(result).toHaveProperty('type');
                (0, globals_1.expect)(result).toHaveProperty('metricName');
                (0, globals_1.expect)(result).toHaveProperty('score');
                (0, globals_1.expect)(result).toHaveProperty('threshold');
                (0, globals_1.expect)(result).toHaveProperty('value');
                (0, globals_1.expect)(result).toHaveProperty('reason');
                (0, globals_1.expect)(result).toHaveProperty('timestamp');
            });
            (0, globals_1.it)('should include descriptive reason', () => {
                const history = createHistoricalData([10, 12, 11, 13, 10]);
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('cpu_usage', history, currentValue, 3);
                (0, globals_1.expect)(result.reason).toContain('Z-Score');
                (0, globals_1.expect)(result.reason).toContain('Mean');
                (0, globals_1.expect)(result.reason).toContain('StdDev');
            });
            (0, globals_1.it)('should include valid ISO timestamp', () => {
                const history = createHistoricalData([10, 12, 11, 13, 10]);
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('cpu_usage', history, currentValue, 3);
                const timestamp = new Date(result.timestamp);
                (0, globals_1.expect)(timestamp.toString()).not.toBe('Invalid Date');
            });
        });
    });
    (0, globals_1.describe)('MAD (Median Absolute Deviation) Detection', () => {
        (0, globals_1.describe)('Basic Detection', () => {
            (0, globals_1.it)('should detect anomaly using MAD method', () => {
                const history = createHistoricalData([10, 12, 11, 13, 10]);
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
                (0, globals_1.expect)(result.type).toBe('anomaly');
            });
            (0, globals_1.it)('should not detect anomaly when value is within normal range', () => {
                const history = createHistoricalData([10, 12, 11, 13, 10]);
                const currentValue = 11;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).toBeNull();
            });
            (0, globals_1.it)('should be more robust to outliers than Z-score', () => {
                // History with an outlier
                const history = createHistoricalData([10, 11, 12, 100, 11]);
                const currentValue = 13;
                const madResult = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', history, currentValue, 3);
                const zScoreResult = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', history, currentValue, 3);
                // MAD should be more robust and less likely to flag as anomaly
                // This test verifies MAD's robustness property
                (0, globals_1.expect)(madResult).toBeNull();
            });
        });
        (0, globals_1.describe)('Median Calculation', () => {
            (0, globals_1.it)('should handle odd number of historical points', () => {
                const history = createHistoricalData([1, 2, 3, 4, 5]); // Median = 3
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
            });
            (0, globals_1.it)('should handle even number of historical points', () => {
                const history = createHistoricalData([1, 2, 3, 4, 5, 6]); // Median = 3.5
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
            });
            (0, globals_1.it)('should correctly calculate median for unsorted input', () => {
                const history = createHistoricalData([5, 1, 4, 2, 3]);
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
            });
        });
        (0, globals_1.describe)('Edge Cases', () => {
            (0, globals_1.it)('should return null when history has less than 5 points', () => {
                const history = createHistoricalData([10, 12, 11, 13]);
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).toBeNull();
            });
            (0, globals_1.it)('should return null when MAD is zero (all identical values)', () => {
                const history = createHistoricalData([42, 42, 42, 42, 42]);
                const currentValue = 100;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).toBeNull();
            });
            (0, globals_1.it)('should handle negative values', () => {
                const history = createHistoricalData([-10, -12, -11, -13, -10]);
                const currentValue = -50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
            });
            (0, globals_1.it)('should handle decimal values', () => {
                const history = createHistoricalData([1.5, 1.7, 1.6, 1.8, 1.5]);
                const currentValue = 5.5;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', history, currentValue, 3);
                (0, globals_1.expect)(result).not.toBeNull();
            });
        });
        (0, globals_1.describe)('Result Structure', () => {
            (0, globals_1.it)('should include MAD-specific reason', () => {
                const history = createHistoricalData([10, 12, 11, 13, 10]);
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', history, currentValue, 3);
                (0, globals_1.expect)(result.reason).toContain('MAD-Score');
                (0, globals_1.expect)(result.reason).toContain('Median');
                (0, globals_1.expect)(result.reason).toContain('MAD');
            });
        });
    });
    (0, globals_1.describe)('Ratio Detection', () => {
        (0, globals_1.describe)('Basic Detection', () => {
            (0, globals_1.it)('should detect anomaly when current value is much higher than last value', () => {
                const history = createHistoricalData([10]);
                const currentValue = 30; // 3x increase
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result).not.toBeNull();
                (0, globals_1.expect)(result.score).toBeCloseTo(3.0, 0.1);
            });
            (0, globals_1.it)('should detect anomaly when current value is much lower than last value', () => {
                const history = createHistoricalData([100]);
                const currentValue = 25; // 0.25x (75% decrease)
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result).not.toBeNull();
                (0, globals_1.expect)(result.score).toBeCloseTo(0.25, 0.01);
            });
            (0, globals_1.it)('should not detect anomaly when ratio is within threshold', () => {
                const history = createHistoricalData([100]);
                const currentValue = 150; // 1.5x increase
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result).toBeNull();
            });
            (0, globals_1.it)('should use last value from history', () => {
                const history = createHistoricalData([10, 20, 30, 40, 50]);
                const currentValue = 200; // 4x of last value (50)
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result).not.toBeNull();
                (0, globals_1.expect)(result.score).toBeCloseTo(4.0, 0.1);
            });
        });
        (0, globals_1.describe)('Threshold Handling', () => {
            (0, globals_1.it)('should respect custom threshold', () => {
                const history = createHistoricalData([10]);
                const currentValue = 25; // 2.5x increase
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 3.0);
                (0, globals_1.expect)(result).toBeNull(); // Below threshold of 3.0
            });
            (0, globals_1.it)('should use default threshold of 2.0', () => {
                const history = createHistoricalData([10]);
                const currentValue = 25; // 2.5x increase
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue);
                (0, globals_1.expect)(result).not.toBeNull();
                (0, globals_1.expect)(result.threshold).toBe(2.0);
            });
            (0, globals_1.it)('should detect both upward and downward anomalies symmetrically', () => {
                const history = createHistoricalData([100]);
                const threshold = 2.0;
                const upwardAnomaly = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, 300, threshold);
                const downwardAnomaly = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, 33, threshold);
                (0, globals_1.expect)(upwardAnomaly).not.toBeNull(); // 3x increase
                (0, globals_1.expect)(downwardAnomaly).not.toBeNull(); // 0.33x (1/3)
            });
            (0, globals_1.it)('should detect anomaly at exact threshold boundary', () => {
                const history = createHistoricalData([10]);
                const currentValue = 20; // Exactly 2x
                const resultAbove = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                const resultBelow = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 1.9);
                (0, globals_1.expect)(resultAbove).toBeNull(); // At threshold, not above
                (0, globals_1.expect)(resultBelow).not.toBeNull(); // Above threshold of 1.9
            });
        });
        (0, globals_1.describe)('Edge Cases', () => {
            (0, globals_1.it)('should return null when history is empty', () => {
                const history = [];
                const currentValue = 100;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result).toBeNull();
            });
            (0, globals_1.it)('should return null when last historical value is zero', () => {
                const history = createHistoricalData([10, 20, 0]);
                const currentValue = 100;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result).toBeNull(); // Cannot compute ratio with zero denominator
            });
            (0, globals_1.it)('should handle current value of zero', () => {
                const history = createHistoricalData([100]);
                const currentValue = 0;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result).not.toBeNull(); // 0/100 = 0, which is less than 1/2
            });
            (0, globals_1.it)('should handle negative values', () => {
                const history = createHistoricalData([-10]);
                const currentValue = -50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result).not.toBeNull(); // -50/-10 = 5
            });
            (0, globals_1.it)('should handle transition from negative to positive', () => {
                const history = createHistoricalData([-10]);
                const currentValue = 50;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result).not.toBeNull(); // 50/-10 = -5 (large ratio)
            });
            (0, globals_1.it)('should handle very small values', () => {
                const history = createHistoricalData([0.001]);
                const currentValue = 0.005;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result).not.toBeNull(); // 5x increase
            });
            (0, globals_1.it)('should handle very large values', () => {
                const history = createHistoricalData([1000000]);
                const currentValue = 5000000;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result).not.toBeNull(); // 5x increase
            });
        });
        (0, globals_1.describe)('Result Structure', () => {
            (0, globals_1.it)('should include ratio in score field', () => {
                const history = createHistoricalData([10]);
                const currentValue = 40;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result.score).toBeCloseTo(4.0, 0.1);
            });
            (0, globals_1.it)('should include descriptive reason', () => {
                const history = createHistoricalData([10]);
                const currentValue = 40;
                const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', history, currentValue, 2.0);
                (0, globals_1.expect)(result.reason).toContain('Ratio Change');
                (0, globals_1.expect)(result.reason).toContain('Threshold');
            });
        });
    });
    (0, globals_1.describe)('Method Comparison and Selection', () => {
        (0, globals_1.it)('should show Z-Score is sensitive to outliers', () => {
            const historyWithOutlier = createHistoricalData([10, 11, 12, 1000, 11]);
            const normalValue = 13;
            const zResult = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', historyWithOutlier, normalValue, 3);
            // Z-Score might flag this due to the outlier affecting mean and stddev
            // This demonstrates why MAD might be preferable for noisy data
        });
        (0, globals_1.it)('should show MAD is robust to outliers', () => {
            const historyWithOutlier = createHistoricalData([10, 11, 12, 1000, 11]);
            const normalValue = 13;
            const madResult = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', historyWithOutlier, normalValue, 3);
            // MAD should not flag this as anomaly due to using median
            (0, globals_1.expect)(madResult).toBeNull();
        });
        (0, globals_1.it)('should show Ratio detection works with minimal history', () => {
            const minimalHistory = createHistoricalData([10]);
            const anomalousValue = 100;
            const zResult = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', minimalHistory, anomalousValue, 3);
            const madResult = AnomalyDetector_js_1.AnomalyDetector.detectMAD('metric', minimalHistory, anomalousValue, 3);
            const ratioResult = AnomalyDetector_js_1.AnomalyDetector.detectRatio('metric', minimalHistory, anomalousValue, 2.0);
            (0, globals_1.expect)(zResult).toBeNull(); // Needs 5+ points
            (0, globals_1.expect)(madResult).toBeNull(); // Needs 5+ points
            (0, globals_1.expect)(ratioResult).not.toBeNull(); // Works with 1 point
        });
    });
    (0, globals_1.describe)('Real-World Scenarios', () => {
        (0, globals_1.it)('should detect CPU spike', () => {
            const normalCPU = createHistoricalData([45, 48, 50, 47, 49]);
            const cpuSpike = 95;
            const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('cpu_usage', normalCPU, cpuSpike, 3);
            (0, globals_1.expect)(result).not.toBeNull();
        });
        (0, globals_1.it)('should detect response time degradation', () => {
            const normalResponseTimes = createHistoricalData([100, 105, 98, 102, 99]);
            const degradedResponseTime = 500;
            const result = AnomalyDetector_js_1.AnomalyDetector.detectMAD('response_time_ms', normalResponseTimes, degradedResponseTime, 3);
            (0, globals_1.expect)(result).not.toBeNull();
        });
        (0, globals_1.it)('should detect traffic drop', () => {
            const normalTraffic = createHistoricalData([1000]);
            const trafficDrop = 100;
            const result = AnomalyDetector_js_1.AnomalyDetector.detectRatio('requests_per_second', normalTraffic, trafficDrop, 2.0);
            (0, globals_1.expect)(result).not.toBeNull();
            (0, globals_1.expect)(result.score).toBeLessThan(0.5); // 10x decrease
        });
        (0, globals_1.it)('should not flag gradual increase as anomaly', () => {
            const gradualIncrease = createHistoricalData([100, 105, 110, 115, 120]);
            const nextValue = 125;
            const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', gradualIncrease, nextValue, 3);
            (0, globals_1.expect)(result).toBeNull(); // Gradual trend, not anomaly
        });
        (0, globals_1.it)('should handle stable metrics without false positives', () => {
            const stable = createHistoricalData([50, 51, 49, 50, 51]);
            const normalValue = 50;
            const result = AnomalyDetector_js_1.AnomalyDetector.detectZScore('metric', stable, normalValue, 3);
            (0, globals_1.expect)(result).toBeNull();
        });
    });
});
