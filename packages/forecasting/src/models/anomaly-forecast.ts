/**
 * Anomaly Forecasting and Detection
 */

import type { TimeSeriesData, ForecastResult, ChangePoint } from '../types/index.js';

export class AnomalyForecaster {
  private threshold: number;
  private windowSize: number;
  private historicalData: TimeSeriesData[] = [];

  constructor(threshold: number = 3.0, windowSize: number = 30) {
    this.threshold = threshold;
    this.windowSize = windowSize;
  }

  /**
   * Fit the anomaly detection model
   */
  fit(data: TimeSeriesData[]): void {
    this.historicalData = [...data];
  }

  /**
   * Forecast future anomalies
   */
  forecastAnomalies(horizon: number): Array<{
    timestamp: Date;
    probability: number;
    expectedValue: number;
    anomalyType: 'spike' | 'drop' | 'changepoint' | 'seasonal';
  }> {
    const results: Array<{
      timestamp: Date;
      probability: number;
      expectedValue: number;
      anomalyType: 'spike' | 'drop' | 'changepoint' | 'seasonal';
    }> = [];

    // Analyze historical patterns
    const spikeProbability = this.calculateSpikeProbability();
    const seasonalAnomalies = this.detectSeasonalAnomalies();

    const lastTimestamp = this.historicalData[this.historicalData.length - 1].timestamp;

    for (let h = 1; h <= horizon; h++) {
      const timestamp = new Date(lastTimestamp.getTime() + h * 24 * 60 * 60 * 1000);
      const seasonalProb = this.getSeasonalAnomalyProbability(timestamp, seasonalAnomalies);

      results.push({
        timestamp,
        probability: Math.max(spikeProbability, seasonalProb),
        expectedValue: this.forecastValue(h),
        anomalyType: seasonalProb > spikeProbability ? 'seasonal' : 'spike',
      });
    }

    return results;
  }

  /**
   * Detect outbreak/spike patterns
   */
  detectOutbreaks(): ChangePoint[] {
    const values = this.historicalData.map(d => d.value);
    const outbreaks: ChangePoint[] = [];

    for (let i = this.windowSize; i < values.length; i++) {
      const window = values.slice(i - this.windowSize, i);
      const mean = this.mean(window);
      const std = this.std(window);

      const zScore = (values[i] - mean) / std;

      if (Math.abs(zScore) > this.threshold) {
        outbreaks.push({
          timestamp: this.historicalData[i].timestamp,
          index: i,
          magnitude: Math.abs(values[i] - mean),
          confidence: Math.min(0.99, Math.abs(zScore) / 10),
        });
      }
    }

    return outbreaks;
  }

  /**
   * Detect trend reversals
   */
  detectTrendReversals(): ChangePoint[] {
    const values = this.historicalData.map(d => d.value);
    const reversals: ChangePoint[] = [];

    for (let i = this.windowSize; i < values.length - this.windowSize; i++) {
      const before = values.slice(i - this.windowSize, i);
      const after = values.slice(i, i + this.windowSize);

      const trendBefore = this.calculateTrend(before);
      const trendAfter = this.calculateTrend(after);

      // Check for reversal (positive to negative or vice versa)
      if (trendBefore * trendAfter < 0) {
        reversals.push({
          timestamp: this.historicalData[i].timestamp,
          index: i,
          magnitude: Math.abs(trendAfter - trendBefore),
          confidence: 0.85,
        });
      }
    }

    return reversals;
  }

  /**
   * Forecast volatility
   */
  forecastVolatility(horizon: number): ForecastResult[] {
    const returns = this.calculateReturns();
    const volatility = this.calculateRollingVolatility(returns, this.windowSize);

    // Simple GARCH-like approach
    const lastVol = volatility[volatility.length - 1];
    const longTermVol = this.mean(volatility);
    const persistence = 0.9;

    const results: ForecastResult[] = [];
    let currentVol = lastVol;

    for (let h = 1; h <= horizon; h++) {
      // Mean reversion
      currentVol = persistence * currentVol + (1 - persistence) * longTermVol;

      const timestamp = new Date(
        this.historicalData[this.historicalData.length - 1].timestamp.getTime() +
        h * 24 * 60 * 60 * 1000
      );

      results.push({
        timestamp,
        forecast: currentVol,
        lowerBound: currentVol * 0.8,
        upperBound: currentVol * 1.2,
        confidence: 0.90,
      });
    }

    return results;
  }

  /**
   * Calculate spike probability based on historical data
   */
  private calculateSpikeProbability(): number {
    const values = this.historicalData.map(d => d.value);
    const mean = this.mean(values);
    const std = this.std(values);

    let spikes = 0;
    for (const value of values) {
      if (Math.abs(value - mean) > this.threshold * std) {
        spikes++;
      }
    }

    return spikes / values.length;
  }

  /**
   * Detect seasonal anomaly patterns
   */
  private detectSeasonalAnomalies(): Map<number, number> {
    const anomaliesByDayOfWeek = new Map<number, number>();

    for (let dow = 0; dow < 7; dow++) {
      const dayData = this.historicalData.filter(d =>
        d.timestamp.getDay() === dow
      );

      if (dayData.length > 0) {
        const values = dayData.map(d => d.value);
        const mean = this.mean(values);
        const std = this.std(values);

        let anomalies = 0;
        for (const value of values) {
          if (Math.abs(value - mean) > 2 * std) {
            anomalies++;
          }
        }

        anomaliesByDayOfWeek.set(dow, anomalies / values.length);
      }
    }

    return anomaliesByDayOfWeek;
  }

  /**
   * Get seasonal anomaly probability for timestamp
   */
  private getSeasonalAnomalyProbability(
    timestamp: Date,
    seasonalAnomalies: Map<number, number>
  ): number {
    const dayOfWeek = timestamp.getDay();
    return seasonalAnomalies.get(dayOfWeek) || 0;
  }

  /**
   * Forecast value using simple method
   */
  private forecastValue(horizon: number): number {
    const recentValues = this.historicalData
      .slice(-this.windowSize)
      .map(d => d.value);
    return this.mean(recentValues);
  }

  /**
   * Calculate returns
   */
  private calculateReturns(): number[] {
    const values = this.historicalData.map(d => d.value);
    const returns: number[] = [];

    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        returns.push((values[i] - values[i - 1]) / values[i - 1]);
      }
    }

    return returns;
  }

  /**
   * Calculate rolling volatility
   */
  private calculateRollingVolatility(returns: number[], window: number): number[] {
    const volatility: number[] = [];

    for (let i = window; i < returns.length; i++) {
      const windowReturns = returns.slice(i - window, i);
      volatility.push(this.std(windowReturns));
    }

    return volatility;
  }

  /**
   * Calculate trend using linear regression
   */
  private calculateTrend(values: number[]): number {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private mean(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private std(arr: number[]): number {
    const avg = this.mean(arr);
    const squareDiffs = arr.map(x => Math.pow(x - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }
}
