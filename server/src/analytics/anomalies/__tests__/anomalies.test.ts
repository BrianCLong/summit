import { describe, it, expect } from '@jest/globals';
import { AnomalyDetector } from '../AnomalyDetector.js';
import { TimeSeriesPoint } from '../types.js';

describe('AnomalyDetector', () => {
    describe('Z-Score', () => {
        it('should detect spike using Z-Score', () => {
            const history: TimeSeriesPoint[] = [
                { timestamp: 1, value: 10 },
                { timestamp: 2, value: 10 },
                { timestamp: 3, value: 11 },
                { timestamp: 4, value: 10 },
                { timestamp: 5, value: 10 },
                { timestamp: 6, value: 10 },
            ];

            // Mean approx 10.16, StdDev small
            // Inject spike: 50
            const anomaly = AnomalyDetector.detectZScore('test_metric', history, 50);

            expect(anomaly).not.toBeNull();
            expect(anomaly!.value).toBe(50);
            expect(anomaly!.score).toBeGreaterThan(3);
        });

        it('should not detect normal variance', () => {
            const history: TimeSeriesPoint[] = [
                 { timestamp: 1, value: 10 },
                 { timestamp: 2, value: 12 },
                 { timestamp: 3, value: 8 },
                 { timestamp: 4, value: 10 },
                 { timestamp: 5, value: 11 },
            ];

            const anomaly = AnomalyDetector.detectZScore('test_metric', history, 11);
            expect(anomaly).toBeNull();
        });
    });

    describe('MAD', () => {
        it('should be robust to outliers in history', () => {
             // To demonstrate MAD robustness, we need enough data.
             // Values: 10, 10, 10, 10, 10, 100.
             // Median: 10.
             // Residuals: 0, 0, 0, 0, 0, 90.
             // MAD (Median of Residuals): 0.
             // If MAD is 0, our implementation returns null to avoid div by zero.
             // We need slightly noisy data so MAD is not 0.
             const history: TimeSeriesPoint[] = [
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

            const anomaly = AnomalyDetector.detectMAD('test_mad', history, 50);
            expect(anomaly).not.toBeNull();
            expect(anomaly!.reason).toContain('MAD');
        });
    });

    describe('Ratio', () => {
        it('should detect sudden ratio change', () => {
            const history: TimeSeriesPoint[] = [
                { timestamp: 1, value: 100 },
            ];
            // Jump to 300 (3x)
            const anomaly = AnomalyDetector.detectRatio('test_ratio', history, 300, 2.0);
            expect(anomaly).not.toBeNull();
            expect(anomaly!.score).toBe(3);
        });
    });
});
