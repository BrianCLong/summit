/**
 * IntelGraph Statistical Anomaly Detector
 * Statistical methods for anomaly detection (Z-score, IQR, MAD)
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { mean, std, median, quantile } from 'simple-statistics';
import {
  Anomaly,
  StatisticalAnomalyConfig,
  TimeSeriesStats
} from '../models/AnomalyModels.js';

export class StatisticalDetector {
  private config: StatisticalAnomalyConfig;

  constructor(config: StatisticalAnomalyConfig) {
    this.config = {
      threshold: 3.0,
      window_size: 50,
      min_samples: 30,
      ...config
    };
  }

  /**
   * Detect anomalies using Z-score method
   */
  detectZScore(data: number[], timestamps: Date[]): Anomaly[] {
    if (data.length < this.config.min_samples!) {
      return [];
    }

    const anomalies: Anomaly[] = [];
    const dataMean = mean(data);
    const dataStd = std(data);

    for (let i = 0; i < data.length; i++) {
      const zScore = Math.abs((data[i] - dataMean) / dataStd);

      if (zScore > this.config.threshold!) {
        anomalies.push({
          timestamp: timestamps[i],
          value: data[i],
          expected_value: dataMean,
          anomaly_score: zScore / this.config.threshold!,
          severity: this.calculateSeverity(zScore / this.config.threshold!),
          type: 'point',
          detector: 'zscore',
          explanation: `Value deviates ${zScore.toFixed(2)} standard deviations from mean`
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect anomalies using rolling Z-score
   */
  detectRollingZScore(data: number[], timestamps: Date[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const window = this.config.window_size!;

    for (let i = window; i < data.length; i++) {
      const windowData = data.slice(i - window, i);
      const windowMean = mean(windowData);
      const windowStd = std(windowData);

      if (windowStd === 0) continue;

      const zScore = Math.abs((data[i] - windowMean) / windowStd);

      if (zScore > this.config.threshold!) {
        anomalies.push({
          timestamp: timestamps[i],
          value: data[i],
          expected_value: windowMean,
          anomaly_score: zScore / this.config.threshold!,
          severity: this.calculateSeverity(zScore / this.config.threshold!),
          type: 'contextual',
          detector: 'rolling_zscore',
          explanation: `Value deviates ${zScore.toFixed(2)} standard deviations from rolling mean`,
          metadata: { window_size: window }
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect anomalies using Interquartile Range (IQR) method
   */
  detectIQR(data: number[], timestamps: Date[]): Anomaly[] {
    if (data.length < this.config.min_samples!) {
      return [];
    }

    const anomalies: Anomaly[] = [];
    const q1 = quantile(data, 0.25);
    const q3 = quantile(data, 0.75);
    const iqr = q3 - q1;

    const lowerBound = q1 - this.config.threshold! * iqr;
    const upperBound = q3 + this.config.threshold! * iqr;

    for (let i = 0; i < data.length; i++) {
      if (data[i] < lowerBound || data[i] > upperBound) {
        const distanceFromBound = data[i] < lowerBound
          ? lowerBound - data[i]
          : data[i] - upperBound;
        const anomalyScore = distanceFromBound / iqr;

        anomalies.push({
          timestamp: timestamps[i],
          value: data[i],
          expected_value: median(data),
          anomaly_score: Math.min(anomalyScore, 1.0),
          severity: this.calculateSeverity(anomalyScore),
          type: 'point',
          detector: 'iqr',
          explanation: `Value outside IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
          metadata: { q1, q3, iqr }
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect anomalies using Median Absolute Deviation (MAD)
   */
  detectMAD(data: number[], timestamps: Date[]): Anomaly[] {
    if (data.length < this.config.min_samples!) {
      return [];
    }

    const anomalies: Anomaly[] = [];
    const dataMedian = median(data);

    // Calculate MAD
    const absoluteDeviations = data.map(x => Math.abs(x - dataMedian));
    const mad = median(absoluteDeviations);

    if (mad === 0) return []; // All values are the same

    // Modified Z-score using MAD
    const threshold = this.config.threshold! || 3.5;

    for (let i = 0; i < data.length; i++) {
      const modifiedZScore = (0.6745 * Math.abs(data[i] - dataMedian)) / mad;

      if (modifiedZScore > threshold) {
        anomalies.push({
          timestamp: timestamps[i],
          value: data[i],
          expected_value: dataMedian,
          anomaly_score: modifiedZScore / threshold,
          severity: this.calculateSeverity(modifiedZScore / threshold),
          type: 'point',
          detector: 'mad',
          explanation: `Modified Z-score of ${modifiedZScore.toFixed(2)} exceeds threshold`,
          metadata: { median: dataMedian, mad }
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect anomalies using Grubbs' test for outliers
   */
  detectGrubbs(data: number[], timestamps: Date[]): Anomaly[] {
    if (data.length < this.config.min_samples!) {
      return [];
    }

    const anomalies: Anomaly[] = [];
    const n = data.length;
    const dataMean = mean(data);
    const dataStd = std(data);

    // Critical value for Grubbs' test (approximate for alpha=0.05)
    const alpha = 0.05;
    const t = this.getTCritical(n - 2, alpha / (2 * n));
    const grubbs_critical = ((n - 1) / Math.sqrt(n)) * Math.sqrt(t * t / (n - 2 + t * t));

    for (let i = 0; i < data.length; i++) {
      const grubbs_stat = Math.abs((data[i] - dataMean) / dataStd);

      if (grubbs_stat > grubbs_critical) {
        anomalies.push({
          timestamp: timestamps[i],
          value: data[i],
          expected_value: dataMean,
          anomaly_score: grubbs_stat / grubbs_critical,
          severity: this.calculateSeverity(grubbs_stat / grubbs_critical),
          type: 'point',
          detector: 'grubbs',
          explanation: `Grubbs statistic ${grubbs_stat.toFixed(2)} exceeds critical value ${grubbs_critical.toFixed(2)}`,
          metadata: { grubbs_stat, grubbs_critical }
        });
      }
    }

    return anomalies;
  }

  /**
   * Calculate time series statistics
   */
  calculateStats(data: number[]): TimeSeriesStats {
    if (data.length === 0) {
      return { mean: 0, median: 0, std: 0, min: 0, max: 0 };
    }

    // Calculate trend using simple linear regression
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < data.length; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }

    const n = data.length;
    const trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return {
      mean: mean(data),
      median: median(data),
      std: std(data),
      min: Math.min(...data),
      max: Math.max(...data),
      trend
    };
  }

  /**
   * Calculate severity based on anomaly score
   */
  private calculateSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 3.0) return 'critical';
    if (score >= 2.0) return 'high';
    if (score >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Get t-distribution critical value (approximation)
   */
  private getTCritical(df: number, alpha: number): number {
    // Simplified approximation - in production use proper t-distribution
    // This is a rough approximation for common values
    if (alpha <= 0.001) return 3.291;
    if (alpha <= 0.01) return 2.576;
    if (alpha <= 0.05) return 1.96;
    return 1.645;
  }

  /**
   * Detect all anomalies using configured method
   */
  detect(data: number[], timestamps: Date[]): Anomaly[] {
    switch (this.config.method) {
      case 'zscore':
        return this.config.window_size
          ? this.detectRollingZScore(data, timestamps)
          : this.detectZScore(data, timestamps);
      case 'iqr':
        return this.detectIQR(data, timestamps);
      case 'mad':
        return this.detectMAD(data, timestamps);
      case 'grubbs':
        return this.detectGrubbs(data, timestamps);
      default:
        return this.detectZScore(data, timestamps);
    }
  }
}
