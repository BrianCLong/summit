/**
 * Time-series anomaly detection (ARIMA-like, seasonal decomposition)
 */

import { IAnomalyDetector } from '@intelgraph/threat-detection-core';
import { AnomalyScore } from '@intelgraph/threat-detection-core';
import * as stats from 'simple-statistics';

export interface TimeSeriesDetectorConfig {
  windowSize: number; // Number of data points for analysis
  seasonality?: number; // Seasonal period (e.g., 24 for hourly data in a day)
  trend: boolean; // Whether to account for trend
  sensitivity: number; // 0-1
}

interface TimeSeriesData {
  timestamp: number;
  value: number;
}

export class TimeSeriesDetector implements IAnomalyDetector {
  private config: TimeSeriesDetectorConfig;
  private historicalData: Map<string, TimeSeriesData[]> = new Map();

  constructor(config: TimeSeriesDetectorConfig) {
    this.config = config;
  }

  async detectAnomaly(data: Record<string, any>): Promise<AnomalyScore> {
    const timestamp = data.timestamp || Date.now();
    const scores: Record<string, number> = {};
    let totalScore = 0;
    let count = 0;

    for (const [feature, value] of Object.entries(data)) {
      if (typeof value !== 'number' || feature === 'timestamp') continue;

      const history = this.historicalData.get(feature) || [];

      if (history.length < this.config.windowSize / 2) {
        // Not enough data yet
        scores[feature] = 0;
        continue;
      }

      const anomalyScore = this.detectTimeSeriesAnomaly(
        feature,
        { timestamp, value },
        history
      );

      scores[feature] = anomalyScore;
      totalScore += anomalyScore;
      count++;
    }

    const overallScore = count > 0 ? totalScore / count : 0;

    return {
      score: overallScore,
      method: 'time_series',
      features: scores,
      explanation: this.generateExplanation(scores)
    };
  }

  async updateBaseline(data: Record<string, any>): Promise<void> {
    const timestamp = data.timestamp || Date.now();

    for (const [feature, value] of Object.entries(data)) {
      if (typeof value !== 'number' || feature === 'timestamp') continue;

      if (!this.historicalData.has(feature)) {
        this.historicalData.set(feature, []);
      }

      const history = this.historicalData.get(feature)!;
      history.push({ timestamp, value });

      // Maintain window size
      if (history.length > this.config.windowSize) {
        history.shift();
      }
    }
  }

  async getBaseline(): Promise<any> {
    const baseline: Record<string, any> = {};

    for (const [feature, data] of this.historicalData.entries()) {
      if (data.length > 0) {
        const values = data.map(d => d.value);
        baseline[feature] = {
          mean: stats.mean(values),
          median: stats.median(values),
          stdDev: stats.standardDeviation(values),
          trend: this.calculateTrend(data),
          seasonality: this.config.seasonality,
          dataPoints: data.length
        };
      }
    }

    return baseline;
  }

  private detectTimeSeriesAnomaly(
    feature: string,
    current: TimeSeriesData,
    history: TimeSeriesData[]
  ): number {
    // Remove trend if configured
    let detrended = [...history];
    if (this.config.trend) {
      detrended = this.removeTrend(history);
    }

    // Remove seasonality if configured
    let deseasoned = detrended;
    if (this.config.seasonality) {
      deseasoned = this.removeSeasonality(detrended, this.config.seasonality);
    }

    // Calculate residuals
    const values = deseasoned.map(d => d.value);
    const mean = stats.mean(values);
    const stdDev = stats.standardDeviation(values);

    if (stdDev === 0) return 0;

    // Forecast next value using exponential smoothing
    const forecast = this.exponentialSmoothing(values);

    // Calculate deviation from forecast
    const deviation = Math.abs(current.value - forecast);
    const zScore = deviation / stdDev;

    // Calculate anomaly score
    const anomalyScore = Math.min(1, zScore / 3) * (1 + this.config.sensitivity);

    return Math.min(1, anomalyScore);
  }

  private removeTrend(data: TimeSeriesData[]): TimeSeriesData[] {
    const trend = this.calculateTrend(data);

    return data.map((point, index) => ({
      timestamp: point.timestamp,
      value: point.value - (trend.slope * index + trend.intercept)
    }));
  }

  private removeSeasonality(
    data: TimeSeriesData[],
    period: number
  ): TimeSeriesData[] {
    // Calculate seasonal indices
    const seasonalIndices = this.calculateSeasonalIndices(data, period);

    return data.map((point, index) => ({
      timestamp: point.timestamp,
      value: point.value - seasonalIndices[index % period]
    }));
  }

  private calculateSeasonalIndices(
    data: TimeSeriesData[],
    period: number
  ): number[] {
    const indices = new Array(period).fill(0);
    const counts = new Array(period).fill(0);

    // Calculate average for each seasonal position
    data.forEach((point, index) => {
      const seasonalPos = index % period;
      indices[seasonalPos] += point.value;
      counts[seasonalPos]++;
    });

    // Average and center around mean
    const overallMean = stats.mean(data.map(d => d.value));

    return indices.map((sum, i) => {
      const avg = counts[i] > 0 ? sum / counts[i] : 0;
      return avg - overallMean;
    });
  }

  private calculateTrend(data: TimeSeriesData[]): {
    slope: number;
    intercept: number;
  } {
    if (data.length < 2) {
      return { slope: 0, intercept: 0 };
    }

    const x = data.map((_, i) => i);
    const y = data.map(d => d.value);

    const result = stats.linearRegression([x, y]);

    return {
      slope: result.m,
      intercept: result.b
    };
  }

  private exponentialSmoothing(values: number[], alpha: number = 0.3): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    let smoothed = values[0];

    for (let i = 1; i < values.length; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    }

    return smoothed;
  }

  private generateExplanation(scores: Record<string, number>): string {
    const anomalies = Object.entries(scores)
      .filter(([_, score]) => score > 0.5)
      .sort(([_, a], [__, b]) => b - a);

    if (anomalies.length === 0) {
      return 'Time-series behavior within expected range';
    }

    const featureList = anomalies
      .map(([feature, score]) => `${feature} (${(score * 100).toFixed(1)}%)`)
      .join(', ');

    return `Time-series anomalies in: ${featureList}`;
  }

  reset(): void {
    this.historicalData.clear();
  }
}
