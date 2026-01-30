import { TimeSeriesPoint, AnomalyEvent } from './types.js';

export class AnomalyDetector {
    // Z-Score implementation
    public static detectZScore(
        metricName: string,
        history: TimeSeriesPoint[],
        currentValue: number,
        threshold: number = 3
    ): AnomalyEvent | null {
        if (history.length < 5) return null; // Not enough data

        const values = history.map(p => p.value);
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev === 0) return null; // No variance

        const zScore = (currentValue - mean) / stdDev;

        if (Math.abs(zScore) > threshold) {
            return {
                type: 'anomaly',
                metricName,
                score: zScore,
                threshold,
                value: currentValue,
                reason: `Z-Score ${zScore.toFixed(2)} > ${threshold} (Mean: ${mean.toFixed(2)}, StdDev: ${stdDev.toFixed(2)})`,
                timestamp: new Date().toISOString()
            };
        }
        return null;
    }

    // Median Absolute Deviation (MAD) implementation
    // More robust to outliers than Z-Score
    public static detectMAD(
        metricName: string,
        history: TimeSeriesPoint[],
        currentValue: number,
        threshold: number = 3
    ): AnomalyEvent | null {
        if (history.length < 5) return null;

        const values = history.map(p => p.value);

        // Calculate Median
        values.sort((a, b) => a - b);
        const mid = Math.floor(values.length / 2);
        const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

        // Calculate MAD
        const residuals = values.map(v => Math.abs(v - median));
        residuals.sort((a, b) => a - b);
        const madMid = Math.floor(residuals.length / 2);
        const mad = residuals.length % 2 !== 0 ? residuals[madMid] : (residuals[madMid - 1] + residuals[madMid]) / 2;

        if (mad === 0) return null;

        // Modified Z-score = 0.6745 * (x - median) / MAD
        const score = 0.6745 * (currentValue - median) / mad;

        if (Math.abs(score) > threshold) {
            return {
                type: 'anomaly',
                metricName,
                score,
                threshold,
                value: currentValue,
                reason: `MAD-Score ${score.toFixed(2)} > ${threshold} (Median: ${median}, MAD: ${mad})`,
                timestamp: new Date().toISOString()
            };
        }
        return null;
    }

    // Ratio of Ratios implementation
    public static detectRatio(
        metricName: string,
        history: TimeSeriesPoint[],
        currentValue: number,
        threshold: number = 2.0 // e.g. 200% increase
    ): AnomalyEvent | null {
         if (history.length < 1) return null;

         const lastValue = history[history.length - 1].value;
         if (lastValue === 0) return null;

         const ratio = currentValue / lastValue;

         if (ratio > threshold || ratio < (1/threshold)) {
             return {
                 type: 'anomaly',
                 metricName,
                 score: ratio,
                 threshold,
                 value: currentValue,
                 reason: `Ratio Change ${ratio.toFixed(2)} vs Threshold ${threshold}`,
                 timestamp: new Date().toISOString()
             };
         }
         return null;
    }
}
