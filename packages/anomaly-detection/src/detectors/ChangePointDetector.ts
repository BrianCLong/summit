/**
 * IntelGraph Change Point Detection
 * Detect significant changes in time series behavior
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { mean, std, variance } from 'simple-statistics';
import { ChangePoint, TimeSeriesStats } from '../models/AnomalyModels.js';

export class ChangePointDetector {
  /**
   * Detect change points using CUSUM (Cumulative Sum) algorithm
   */
  detectCUSUM(
    data: number[],
    timestamps: Date[],
    threshold: number = 5.0,
    drift: number = 0.5
  ): ChangePoint[] {
    const changePoints: ChangePoint[] = [];
    const dataMean = mean(data);
    const dataStd = std(data);

    let cumulativeSum = 0;
    let maxCumulativeSum = 0;

    for (let i = 0; i < data.length; i++) {
      const normalizedValue = (data[i] - dataMean) / dataStd;
      cumulativeSum = Math.max(0, cumulativeSum + normalizedValue - drift);

      if (cumulativeSum > threshold && cumulativeSum > maxCumulativeSum) {
        maxCumulativeSum = cumulativeSum;

        // Found a change point
        const beforeData = data.slice(Math.max(0, i - 20), i);
        const afterData = data.slice(i, Math.min(data.length, i + 20));

        if (beforeData.length > 5 && afterData.length > 5) {
          changePoints.push({
            timestamp: timestamps[i],
            index: i,
            confidence: Math.min(cumulativeSum / (threshold * 2), 1.0),
            change_magnitude: Math.abs(mean(afterData) - mean(beforeData)),
            change_type: 'mean',
            before_stats: this.calculateStats(beforeData),
            after_stats: this.calculateStats(afterData)
          });

          cumulativeSum = 0;
          maxCumulativeSum = 0;
        }
      }
    }

    return changePoints;
  }

  /**
   * Detect change points using Bayesian Online Change Point Detection
   */
  detectBayesian(
    data: number[],
    timestamps: Date[],
    hazardRate: number = 0.01,
    threshold: number = 0.5
  ): ChangePoint[] {
    const changePoints: ChangePoint[] = [];
    const n = data.length;

    // Run length probabilities
    let runLengthProbs = new Array(n).fill(0);
    runLengthProbs[0] = 1;

    for (let t = 1; t < n; t++) {
      // Calculate predictive probability for each run length
      const newRunLengthProbs = new Array(t + 1).fill(0);

      for (let r = 0; r <= t - 1; r++) {
        if (runLengthProbs[r] === 0) continue;

        // Probability of continuing current run
        const continuePr = (1 - hazardRate) * runLengthProbs[r];
        newRunLengthProbs[r + 1] += continuePr;

        // Probability of starting new run
        const changePr = hazardRate * runLengthProbs[r];
        newRunLengthProbs[0] += changePr;
      }

      // Normalize
      const total = newRunLengthProbs.reduce((a, b) => a + b, 0);
      runLengthProbs = newRunLengthProbs.map(p => p / total);

      // Detect change point if probability mass at run length 0 is high
      if (runLengthProbs[0] > threshold) {
        const windowSize = 20;
        const beforeData = data.slice(Math.max(0, t - windowSize), t);
        const afterData = data.slice(t, Math.min(n, t + windowSize));

        if (beforeData.length > 5 && afterData.length > 5) {
          changePoints.push({
            timestamp: timestamps[t],
            index: t,
            confidence: runLengthProbs[0],
            change_magnitude: Math.abs(mean(afterData) - mean(beforeData)),
            change_type: 'mean',
            before_stats: this.calculateStats(beforeData),
            after_stats: this.calculateStats(afterData)
          });
        }
      }
    }

    return changePoints;
  }

  /**
   * Detect variance changes using sliding window
   */
  detectVarianceChange(
    data: number[],
    timestamps: Date[],
    windowSize: number = 30,
    threshold: number = 2.0
  ): ChangePoint[] {
    const changePoints: ChangePoint[] = [];

    for (let i = windowSize; i < data.length - windowSize; i++) {
      const beforeWindow = data.slice(i - windowSize, i);
      const afterWindow = data.slice(i, i + windowSize);

      const beforeVar = variance(beforeWindow);
      const afterVar = variance(afterWindow);

      // F-test for variance change
      const fStat = Math.max(beforeVar, afterVar) / Math.min(beforeVar, afterVar);

      if (fStat > threshold) {
        changePoints.push({
          timestamp: timestamps[i],
          index: i,
          confidence: Math.min(fStat / (threshold * 2), 1.0),
          change_magnitude: Math.abs(Math.sqrt(afterVar) - Math.sqrt(beforeVar)),
          change_type: 'variance',
          before_stats: this.calculateStats(beforeWindow),
          after_stats: this.calculateStats(afterWindow)
        });
      }
    }

    return this.mergeNearbyChangePoints(changePoints, windowSize);
  }

  /**
   * Detect trend changes
   */
  detectTrendChange(
    data: number[],
    timestamps: Date[],
    windowSize: number = 30,
    threshold: number = 0.1
  ): ChangePoint[] {
    const changePoints: ChangePoint[] = [];

    for (let i = windowSize; i < data.length - windowSize; i++) {
      const beforeWindow = data.slice(i - windowSize, i);
      const afterWindow = data.slice(i, i + windowSize);

      const beforeTrend = this.calculateTrend(beforeWindow);
      const afterTrend = this.calculateTrend(afterWindow);

      const trendChange = Math.abs(afterTrend - beforeTrend);

      if (trendChange > threshold) {
        changePoints.push({
          timestamp: timestamps[i],
          index: i,
          confidence: Math.min(trendChange / (threshold * 2), 1.0),
          change_magnitude: trendChange,
          change_type: 'trend',
          before_stats: this.calculateStats(beforeWindow),
          after_stats: this.calculateStats(afterWindow)
        });
      }
    }

    return this.mergeNearbyChangePoints(changePoints, windowSize);
  }

  /**
   * Calculate trend using linear regression
   */
  private calculateTrend(data: number[]): number {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * Calculate statistics for a window
   */
  private calculateStats(data: number[]): TimeSeriesStats {
    return {
      mean: mean(data),
      median: data.length > 0 ? data[Math.floor(data.length / 2)] : 0,
      std: std(data),
      min: Math.min(...data),
      max: Math.max(...data),
      trend: this.calculateTrend(data)
    };
  }

  /**
   * Merge nearby change points to avoid duplicates
   */
  private mergeNearbyChangePoints(
    changePoints: ChangePoint[],
    minDistance: number
  ): ChangePoint[] {
    if (changePoints.length === 0) return [];

    const merged: ChangePoint[] = [changePoints[0]];

    for (let i = 1; i < changePoints.length; i++) {
      const last = merged[merged.length - 1];
      const current = changePoints[i];

      if (current.index - last.index < minDistance) {
        // Keep the one with higher confidence
        if (current.confidence > last.confidence) {
          merged[merged.length - 1] = current;
        }
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Comprehensive change point detection
   */
  detect(
    data: number[],
    timestamps: Date[],
    options: {
      detectMean?: boolean;
      detectVariance?: boolean;
      detectTrend?: boolean;
      threshold?: number;
    } = {}
  ): ChangePoint[] {
    const {
      detectMean = true,
      detectVariance = true,
      detectTrend = true,
      threshold = 5.0
    } = options;

    let allChangePoints: ChangePoint[] = [];

    if (detectMean) {
      allChangePoints = allChangePoints.concat(
        this.detectCUSUM(data, timestamps, threshold)
      );
    }

    if (detectVariance) {
      allChangePoints = allChangePoints.concat(
        this.detectVarianceChange(data, timestamps)
      );
    }

    if (detectTrend) {
      allChangePoints = allChangePoints.concat(
        this.detectTrendChange(data, timestamps)
      );
    }

    // Sort by timestamp and remove duplicates
    allChangePoints.sort((a, b) => a.index - b.index);
    return this.mergeNearbyChangePoints(allChangePoints, 20);
  }
}
