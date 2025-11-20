/**
 * Statistical anomaly detection using Z-score, IQR, MAD, etc.
 */

import { IAnomalyDetector } from '@intelgraph/threat-detection-core';
import { AnomalyScore } from '@intelgraph/threat-detection-core';
import {
  calculateZScore,
  calculateIQRScore,
  zScoreToAnomalyScore
} from '@intelgraph/threat-detection-core';
import * as stats from 'simple-statistics';

export interface StatisticalAnomalyDetectorConfig {
  method: 'zscore' | 'iqr' | 'mad' | 'grubbs' | 'ensemble';
  sensitivity: number; // 0-1, higher = more sensitive
  windowSize?: number; // Number of historical data points to consider
  autoUpdate: boolean; // Automatically update baseline
}

export class StatisticalAnomalyDetector implements IAnomalyDetector {
  private baseline: Map<string, number[]> = new Map();
  private config: StatisticalAnomalyDetectorConfig;

  constructor(config: StatisticalAnomalyDetectorConfig) {
    this.config = config;
  }

  async detectAnomaly(data: Record<string, any>): Promise<AnomalyScore> {
    const scores: Record<string, number> = {};
    let totalScore = 0;
    let featureCount = 0;

    // Analyze each numeric feature
    for (const [feature, value] of Object.entries(data)) {
      if (typeof value !== 'number') continue;

      const baselineData = this.baseline.get(feature);
      if (!baselineData || baselineData.length < 2) {
        // Not enough data for baseline
        scores[feature] = 0;
        continue;
      }

      const anomalyScore = await this.detectFeatureAnomaly(
        feature,
        value,
        baselineData
      );

      scores[feature] = anomalyScore;
      totalScore += anomalyScore;
      featureCount++;

      // Auto-update baseline if configured
      if (this.config.autoUpdate && anomalyScore < 0.7) {
        await this.updateBaseline({ [feature]: value });
      }
    }

    const overallScore = featureCount > 0 ? totalScore / featureCount : 0;

    return {
      score: Math.min(1, overallScore * (1 + this.config.sensitivity)),
      method: this.config.method,
      features: scores,
      explanation: this.generateExplanation(scores, overallScore)
    };
  }

  private async detectFeatureAnomaly(
    feature: string,
    value: number,
    baselineData: number[]
  ): Promise<number> {
    switch (this.config.method) {
      case 'zscore':
        return this.zScoreMethod(value, baselineData);

      case 'iqr':
        return this.iqrMethod(value, baselineData);

      case 'mad':
        return this.madMethod(value, baselineData);

      case 'grubbs':
        return this.grubbsMethod(value, baselineData);

      case 'ensemble':
        return this.ensembleMethod(value, baselineData);

      default:
        return this.zScoreMethod(value, baselineData);
    }
  }

  private zScoreMethod(value: number, baselineData: number[]): number {
    const mean = stats.mean(baselineData);
    const stdDev = stats.standardDeviation(baselineData);

    if (stdDev === 0) return 0;

    const zScore = calculateZScore(value, mean, stdDev);
    return zScoreToAnomalyScore(zScore);
  }

  private iqrMethod(value: number, baselineData: number[]): number {
    const sorted = [...baselineData].sort((a, b) => a - b);
    const q1 = stats.quantile(sorted, 0.25);
    const q3 = stats.quantile(sorted, 0.75);

    return calculateIQRScore(value, q1, q3);
  }

  private madMethod(value: number, baselineData: number[]): number {
    // Median Absolute Deviation
    const median = stats.median(baselineData);
    const absoluteDeviations = baselineData.map(x => Math.abs(x - median));
    const mad = stats.median(absoluteDeviations);

    if (mad === 0) return 0;

    const modifiedZScore = 0.6745 * (value - median) / mad;
    return zScoreToAnomalyScore(modifiedZScore);
  }

  private grubbsMethod(value: number, baselineData: number[]): number {
    // Grubbs test for outliers
    const mean = stats.mean(baselineData);
    const stdDev = stats.standardDeviation(baselineData);
    const n = baselineData.length;

    if (stdDev === 0 || n < 3) return 0;

    const g = Math.abs(value - mean) / stdDev;

    // Critical value approximation for 95% confidence
    const tDist = 1.96; // Approximation
    const gCritical = ((n - 1) / Math.sqrt(n)) *
      Math.sqrt(Math.pow(tDist, 2) / (n - 2 + Math.pow(tDist, 2)));

    return g > gCritical ? Math.min(1, g / (2 * gCritical)) : 0;
  }

  private ensembleMethod(value: number, baselineData: number[]): number {
    // Combine multiple methods
    const scores = [
      this.zScoreMethod(value, baselineData),
      this.iqrMethod(value, baselineData),
      this.madMethod(value, baselineData)
    ];

    // Return max score (most conservative)
    return Math.max(...scores);
  }

  async updateBaseline(data: Record<string, any>): Promise<void> {
    for (const [feature, value] of Object.entries(data)) {
      if (typeof value !== 'number') continue;

      if (!this.baseline.has(feature)) {
        this.baseline.set(feature, []);
      }

      const baselineData = this.baseline.get(feature)!;
      baselineData.push(value);

      // Maintain window size
      if (this.config.windowSize && baselineData.length > this.config.windowSize) {
        baselineData.shift();
      }
    }
  }

  async getBaseline(): Promise<any> {
    const baseline: Record<string, any> = {};

    for (const [feature, data] of this.baseline.entries()) {
      if (data.length > 0) {
        baseline[feature] = {
          mean: stats.mean(data),
          median: stats.median(data),
          stdDev: stats.standardDeviation(data),
          min: stats.min(data),
          max: stats.max(data),
          q1: stats.quantile(data, 0.25),
          q3: stats.quantile(data, 0.75),
          sampleSize: data.length
        };
      }
    }

    return baseline;
  }

  private generateExplanation(
    featureScores: Record<string, number>,
    overallScore: number
  ): string {
    const anomalousFeatures = Object.entries(featureScores)
      .filter(([_, score]) => score > 0.5)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3);

    if (anomalousFeatures.length === 0) {
      return 'No significant anomalies detected';
    }

    const featureList = anomalousFeatures
      .map(([feature, score]) => `${feature} (${(score * 100).toFixed(1)}%)`)
      .join(', ');

    return `Anomaly detected in ${anomalousFeatures.length} feature(s): ${featureList}`;
  }

  reset(): void {
    this.baseline.clear();
  }

  setBaseline(baseline: Map<string, number[]>): void {
    this.baseline = baseline;
  }
}
