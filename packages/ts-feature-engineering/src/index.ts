/**
 * IntelGraph Time Series Feature Engineering
 * Extract features from time series for machine learning
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { mean, standardDeviation, min, max, quantile } from 'simple-statistics';

export interface TimeSeriesFeatures {
  // Statistical features
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  q25: number;
  q75: number;
  iqr: number;
  skewness: number;
  kurtosis: number;

  // Lag features
  lag_features?: Record<string, number>;

  // Rolling window features
  rolling_mean?: number[];
  rolling_std?: number[];

  // Trend features
  trend_slope: number;
  trend_r_squared: number;

  // Seasonality features
  autocorrelation: number[];
  partial_autocorrelation?: number[];

  // Entropy and complexity
  entropy: number;
  complexity: number;

  // Peak and trough detection
  num_peaks: number;
  num_troughs: number;
  peak_prominence: number[];

  // Time-based features
  time_features?: {
    hour?: number;
    day_of_week?: number;
    day_of_month?: number;
    month?: number;
    quarter?: number;
    is_weekend?: boolean;
    is_holiday?: boolean;
  };
}

export class FeatureExtractor {
  /**
   * Extract comprehensive features from time series
   */
  static extractFeatures(data: number[], timestamps?: Date[]): TimeSeriesFeatures {
    return {
      ...this.extractStatisticalFeatures(data),
      ...this.extractTrendFeatures(data),
      ...this.extractSeasonalityFeatures(data),
      ...this.extractComplexityFeatures(data),
      ...this.extractPeakFeatures(data),
      ...(timestamps ? this.extractTimeFeatures(timestamps) : {})
    };
  }

  /**
   * Extract statistical features
   */
  static extractStatisticalFeatures(data: number[]): Partial<TimeSeriesFeatures> {
    const m = mean(data);
    const sorted = [...data].sort((a, b) => a - b);

    // Calculate moments
    const deviations = data.map(v => v - m);
    const variance = deviations.reduce((sum, d) => sum + d * d, 0) / data.length;
    const std_val = Math.sqrt(variance);

    const skewness = deviations.reduce((sum, d) => sum + Math.pow(d, 3), 0) /
      (data.length * Math.pow(std_val, 3));

    const kurtosis = deviations.reduce((sum, d) => sum + Math.pow(d, 4), 0) /
      (data.length * Math.pow(std_val, 4)) - 3;

    return {
      mean: m,
      std: std_val,
      min: min(data),
      max: max(data),
      median: quantile(sorted, 0.5),
      q25: quantile(sorted, 0.25),
      q75: quantile(sorted, 0.75),
      iqr: quantile(sorted, 0.75) - quantile(sorted, 0.25),
      skewness,
      kurtosis
    };
  }

  /**
   * Extract trend features
   */
  static extractTrendFeatures(data: number[]): Partial<TimeSeriesFeatures> {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = mean(data);
    let ssTot = 0, ssRes = 0;

    for (let i = 0; i < n; i++) {
      const yPred = slope * i + intercept;
      ssTot += Math.pow(data[i] - yMean, 2);
      ssRes += Math.pow(data[i] - yPred, 2);
    }

    const r_squared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

    return {
      trend_slope: slope,
      trend_r_squared: r_squared
    };
  }

  /**
   * Extract seasonality features (autocorrelation)
   */
  static extractSeasonalityFeatures(data: number[], maxLag: number = 20): Partial<TimeSeriesFeatures> {
    const autocorrelation: number[] = [];
    const m = mean(data);
    let c0 = 0;

    for (let i = 0; i < data.length; i++) {
      c0 += Math.pow(data[i] - m, 2);
    }

    for (let lag = 1; lag <= Math.min(maxLag, Math.floor(data.length / 2)); lag++) {
      let cLag = 0;
      for (let i = 0; i < data.length - lag; i++) {
        cLag += (data[i] - m) * (data[i + lag] - m);
      }
      autocorrelation.push(c0 === 0 ? 0 : cLag / c0);
    }

    return { autocorrelation };
  }

  /**
   * Extract complexity features
   */
  static extractComplexityFeatures(data: number[]): Partial<TimeSeriesFeatures> {
    // Approximate entropy
    const entropy = this.calculateApproximateEntropy(data);

    // Sample entropy (complexity measure)
    const complexity = this.calculateSampleEntropy(data);

    return { entropy, complexity };
  }

  /**
   * Calculate approximate entropy
   */
  private static calculateApproximateEntropy(data: number[], m: number = 2, r: number = 0.2): number {
    const n = data.length;
    const std_val = standardDeviation(data);
    const tolerance = r * std_val;

    const phi = (m: number): number => {
      const patterns: number[][] = [];
      for (let i = 0; i <= n - m; i++) {
        patterns.push(data.slice(i, i + m));
      }

      let sum = 0;
      for (const pattern of patterns) {
        let matches = 0;
        for (const other of patterns) {
          const maxDiff = Math.max(...pattern.map((v, i) => Math.abs(v - other[i])));
          if (maxDiff <= tolerance) matches++;
        }
        sum += Math.log(matches / patterns.length);
      }

      return sum / patterns.length;
    };

    return Math.abs(phi(m) - phi(m + 1));
  }

  /**
   * Calculate sample entropy
   */
  private static calculateSampleEntropy(data: number[], m: number = 2, r: number = 0.2): number {
    const n = data.length;
    const std_val = standardDeviation(data);
    const tolerance = r * std_val;

    const countMatches = (m: number): number => {
      let count = 0;
      for (let i = 0; i < n - m; i++) {
        for (let j = i + 1; j < n - m; j++) {
          let match = true;
          for (let k = 0; k < m; k++) {
            if (Math.abs(data[i + k] - data[j + k]) > tolerance) {
              match = false;
              break;
            }
          }
          if (match) count++;
        }
      }
      return count;
    };

    const A = countMatches(m);
    const B = countMatches(m + 1);

    return A === 0 || B === 0 ? 0 : -Math.log(B / A);
  }

  /**
   * Extract peak and trough features
   */
  static extractPeakFeatures(data: number[]): Partial<TimeSeriesFeatures> {
    const peaks: number[] = [];
    const troughs: number[] = [];

    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
        peaks.push(i);
      }
      if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
        troughs.push(i);
      }
    }

    // Calculate peak prominence
    const peak_prominence = peaks.map(peakIdx => {
      const peakValue = data[peakIdx];
      let leftMin = peakValue;
      let rightMin = peakValue;

      for (let i = peakIdx - 1; i >= 0; i--) {
        leftMin = Math.min(leftMin, data[i]);
      }

      for (let i = peakIdx + 1; i < data.length; i++) {
        rightMin = Math.min(rightMin, data[i]);
      }

      return peakValue - Math.max(leftMin, rightMin);
    });

    return {
      num_peaks: peaks.length,
      num_troughs: troughs.length,
      peak_prominence
    };
  }

  /**
   * Extract time-based features
   */
  static extractTimeFeatures(timestamps: Date[]): Partial<TimeSeriesFeatures> {
    if (timestamps.length === 0) return {};

    const latestTimestamp = timestamps[timestamps.length - 1];

    return {
      time_features: {
        hour: latestTimestamp.getHours(),
        day_of_week: latestTimestamp.getDay(),
        day_of_month: latestTimestamp.getDate(),
        month: latestTimestamp.getMonth() + 1,
        quarter: Math.floor(latestTimestamp.getMonth() / 3) + 1,
        is_weekend: latestTimestamp.getDay() === 0 || latestTimestamp.getDay() === 6
      }
    };
  }

  /**
   * Create lag features
   */
  static createLagFeatures(data: number[], lags: number[]): Record<string, number[]> {
    const lagFeatures: Record<string, number[]> = {};

    for (const lag of lags) {
      lagFeatures[`lag_${lag}`] = [
        ...new Array(lag).fill(NaN),
        ...data.slice(0, -lag)
      ];
    }

    return lagFeatures;
  }

  /**
   * Create rolling window features
   */
  static createRollingFeatures(
    data: number[],
    windowSize: number
  ): { rolling_mean: number[]; rolling_std: number[] } {
    const rolling_mean: number[] = [];
    const rolling_std: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = data.slice(start, i + 1);

      rolling_mean.push(mean(window));
      rolling_std.push(standardDeviation(window));
    }

    return { rolling_mean, rolling_std };
  }
}
