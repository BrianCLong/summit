/**
 * Anomaly Predictor Algorithm
 * Forecasts when anomalies will occur based on historical patterns
 */

import {
  AnomalyPrediction,
  AnomalyPredictionCreate,
  Severity,
  OnsetWindow,
} from '../models/AnomalyPrediction.js';
import { TimeSeries, DataPoint } from '../models/TimeWarpedTimeline.js';
import { randomUUID } from 'crypto';

export interface PredictionConfig {
  lookaheadMs: number;
  minConfidence: number;
  windowSizeMs: number;
  historicalDataMs: number;
}

export interface AnomalyPattern {
  frequency: number;
  typicalDuration: number;
  severity: Severity;
  precursorWindow: number;
}

export class AnomalyPredictor {
  private config: PredictionConfig;

  constructor(config: PredictionConfig) {
    this.config = config;
  }

  /**
   * Predict upcoming anomalies for an entity
   */
  async predict(
    entityId: string,
    timeSeries: TimeSeries[],
    historicalAnomalies: AnomalyPattern[],
  ): Promise<AnomalyPredictionCreate[]> {
    const predictions: AnomalyPredictionCreate[] = [];

    // Extract features from time series
    const features = this.extractFeatures(timeSeries);

    // Apply multiple prediction models
    const arimaPredictions = this.predictWithARIMA(
      entityId,
      timeSeries,
      historicalAnomalies,
    );
    const trendPredictions = this.predictWithTrendAnalysis(
      entityId,
      timeSeries,
      features,
    );
    const patternPredictions = this.predictWithPatternMatching(
      entityId,
      timeSeries,
      historicalAnomalies,
    );

    // Ensemble predictions
    const ensemblePredictions = this.ensemblePredictions([
      ...arimaPredictions,
      ...trendPredictions,
      ...patternPredictions,
    ]);

    // Filter by confidence threshold
    return ensemblePredictions.filter(
      (p) => p.confidence >= this.config.minConfidence,
    );
  }

  /**
   * Extract statistical features from time series
   */
  private extractFeatures(timeSeries: TimeSeries[]): Map<string, number[]> {
    const features = new Map<string, number[]>();

    for (const ts of timeSeries) {
      const values = ts.dataPoints.map((p) => p.value);

      features.set(`${ts.metricName}_mean`, [this.calculateMean(values)]);
      features.set(`${ts.metricName}_variance`, [
        this.calculateVariance(values),
      ]);
      features.set(`${ts.metricName}_skewness`, [
        this.calculateSkewness(values),
      ]);
      features.set(`${ts.metricName}_kurtosis`, [
        this.calculateKurtosis(values),
      ]);
      features.set(`${ts.metricName}_trend`, [this.calculateTrend(values)]);
      features.set(`${ts.metricName}_volatility`, [
        this.calculateVolatility(values),
      ]);
    }

    return features;
  }

  /**
   * ARIMA-based prediction (simplified implementation)
   */
  private predictWithARIMA(
    entityId: string,
    timeSeries: TimeSeries[],
    historicalAnomalies: AnomalyPattern[],
  ): AnomalyPredictionCreate[] {
    const predictions: AnomalyPredictionCreate[] = [];

    // For each metric, check if it's trending toward anomalous values
    for (const ts of timeSeries) {
      const values = ts.dataPoints.map((p) => p.value);
      if (values.length < 10) continue; // Need sufficient history

      // Calculate forecast
      const forecast = this.simpleAutoRegression(values, 10);

      // Check if forecast values are anomalous
      const mean = this.calculateMean(values);
      const stdDev = Math.sqrt(this.calculateVariance(values));
      const threshold = mean + 3 * stdDev; // 3-sigma rule

      for (let i = 0; i < forecast.length; i++) {
        if (Math.abs(forecast[i]) > threshold) {
          const onsetTime = new Date(
            ts.endTime.getTime() + i * this.config.windowSizeMs,
          );
          const confidence = this.calculateForecastConfidence(values, i);

          if (onsetTime.getTime() <= Date.now() + this.config.lookaheadMs) {
            predictions.push({
              entityId,
              predictedOnsetTime: onsetTime,
              onsetWindow: this.calculateOnsetWindow(onsetTime, confidence),
              expectedSeverity: this.estimateSeverity(
                forecast[i],
                mean,
                stdDev,
              ),
              confidence,
              contributingFactors: [`${ts.metricName} forecast anomaly`],
              metadata: {
                method: 'ARIMA',
                forecastValue: forecast[i],
                threshold,
              },
            });
          }
        }
      }
    }

    return predictions;
  }

  /**
   * Trend-based prediction
   */
  private predictWithTrendAnalysis(
    entityId: string,
    timeSeries: TimeSeries[],
    features: Map<string, number[]>,
  ): AnomalyPredictionCreate[] {
    const predictions: AnomalyPredictionCreate[] = [];

    for (const ts of timeSeries) {
      const values = ts.dataPoints.map((p) => p.value);
      const trend = this.calculateTrend(values);
      const volatility = this.calculateVolatility(values);

      // High trend + high volatility = potential anomaly
      if (Math.abs(trend) > 0.5 && volatility > 1.0) {
        const onsetTime = new Date(
          ts.endTime.getTime() + 15 * 60 * 1000,
        ); // 15 min ahead
        const confidence = Math.min(Math.abs(trend) * volatility * 0.5, 0.95);

        if (onsetTime.getTime() <= Date.now() + this.config.lookaheadMs) {
          predictions.push({
            entityId,
            predictedOnsetTime: onsetTime,
            onsetWindow: this.calculateOnsetWindow(onsetTime, confidence),
            expectedSeverity: this.estimateSeverityFromTrend(trend, volatility),
            confidence,
            contributingFactors: [
              `${ts.metricName} trend acceleration`,
              'High volatility',
            ],
            metadata: {
              method: 'TREND',
              trend,
              volatility,
            },
          });
        }
      }
    }

    return predictions;
  }

  /**
   * Pattern matching prediction
   */
  private predictWithPatternMatching(
    entityId: string,
    timeSeries: TimeSeries[],
    historicalAnomalies: AnomalyPattern[],
  ): AnomalyPredictionCreate[] {
    const predictions: AnomalyPredictionCreate[] = [];

    // Check if current pattern matches historical pre-anomaly patterns
    for (const pattern of historicalAnomalies) {
      const matchScore = this.calculatePatternMatchScore(
        timeSeries,
        pattern,
      );

      if (matchScore > 0.7) {
        const onsetTime = new Date(
          Date.now() + pattern.precursorWindow,
        );
        const confidence = matchScore * 0.9; // Slightly conservative

        if (onsetTime.getTime() <= Date.now() + this.config.lookaheadMs) {
          predictions.push({
            entityId,
            predictedOnsetTime: onsetTime,
            onsetWindow: this.calculateOnsetWindow(onsetTime, confidence),
            expectedSeverity: pattern.severity,
            confidence,
            contributingFactors: ['Historical pattern match'],
            metadata: {
              method: 'PATTERN_MATCH',
              matchScore,
              patternFrequency: pattern.frequency,
            },
          });
        }
      }
    }

    return predictions;
  }

  /**
   * Ensemble multiple predictions
   */
  private ensemblePredictions(
    predictions: AnomalyPredictionCreate[],
  ): AnomalyPredictionCreate[] {
    if (predictions.length === 0) return [];

    // Group predictions by similar onset time (within 1 hour)
    const groups: AnomalyPredictionCreate[][] = [];
    const oneHour = 60 * 60 * 1000;

    for (const pred of predictions) {
      let added = false;

      for (const group of groups) {
        const timeDiff = Math.abs(
          group[0].predictedOnsetTime.getTime() -
            pred.predictedOnsetTime.getTime(),
        );

        if (timeDiff < oneHour) {
          group.push(pred);
          added = true;
          break;
        }
      }

      if (!added) {
        groups.push([pred]);
      }
    }

    // Average predictions within each group
    const ensemble: AnomalyPredictionCreate[] = [];

    for (const group of groups) {
      const avgOnsetTime = new Date(
        group.reduce((sum, p) => sum + p.predictedOnsetTime.getTime(), 0) /
          group.length,
      );
      const avgConfidence =
        group.reduce((sum, p) => sum + p.confidence, 0) / group.length;
      const maxSeverity = this.maxSeverity(
        group.map((p) => p.expectedSeverity),
      );

      const contributingFactors = Array.from(
        new Set(group.flatMap((p) => p.contributingFactors)),
      );

      ensemble.push({
        entityId: group[0].entityId,
        predictedOnsetTime: avgOnsetTime,
        onsetWindow: this.calculateOnsetWindow(avgOnsetTime, avgConfidence),
        expectedSeverity: maxSeverity,
        confidence: avgConfidence,
        contributingFactors,
        metadata: {
          method: 'ENSEMBLE',
          modelCount: group.length,
        },
      });
    }

    return ensemble;
  }

  // === Helper Functions ===

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateVariance(values: number[]): number {
    const mean = this.calculateMean(values);
    return (
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length
    );
  }

  private calculateSkewness(values: number[]): number {
    const mean = this.calculateMean(values);
    const variance = this.calculateVariance(values);
    const stdDev = Math.sqrt(variance);

    const n = values.length;
    const skew =
      values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) /
      n;

    return skew;
  }

  private calculateKurtosis(values: number[]): number {
    const mean = this.calculateMean(values);
    const variance = this.calculateVariance(values);
    const stdDev = Math.sqrt(variance);

    const n = values.length;
    const kurt =
      values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) /
        n -
      3;

    return kurt;
  }

  private calculateTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const xMean = (n - 1) / 2;
    const yMean = this.calculateMean(values);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i - 1]) / values[i - 1]);
    }

    return Math.sqrt(this.calculateVariance(returns));
  }

  private simpleAutoRegression(
    values: number[],
    steps: number,
  ): number[] {
    const forecast: number[] = [];
    const order = Math.min(5, Math.floor(values.length / 2)); // AR(5) or less

    for (let i = 0; i < steps; i++) {
      let prediction = 0;
      const recentValues = [...values, ...forecast].slice(-(order + 1));

      // Simple AR: next = weighted average of recent values
      for (let j = 0; j < order; j++) {
        const weight = (order - j) / ((order * (order + 1)) / 2);
        prediction += weight * recentValues[recentValues.length - 1 - j];
      }

      forecast.push(prediction);
    }

    return forecast;
  }

  private calculateForecastConfidence(
    historicalValues: number[],
    stepsAhead: number,
  ): number {
    // Confidence decreases with forecast horizon
    const baseConfidence = 0.9;
    const decayRate = 0.05;
    return Math.max(baseConfidence - stepsAhead * decayRate, 0.5);
  }

  private estimateSeverity(
    forecastValue: number,
    mean: number,
    stdDev: number,
  ): Severity {
    const zScore = Math.abs((forecastValue - mean) / stdDev);

    if (zScore > 5) return Severity.CRITICAL;
    if (zScore > 4) return Severity.HIGH;
    if (zScore > 3) return Severity.MEDIUM;
    return Severity.LOW;
  }

  private estimateSeverityFromTrend(
    trend: number,
    volatility: number,
  ): Severity {
    const score = Math.abs(trend) * volatility;

    if (score > 2.0) return Severity.CRITICAL;
    if (score > 1.5) return Severity.HIGH;
    if (score > 1.0) return Severity.MEDIUM;
    return Severity.LOW;
  }

  private calculateOnsetWindow(
    predictedTime: Date,
    confidence: number,
  ): OnsetWindow {
    // Window size inversely proportional to confidence
    const baseWindowMs = 30 * 60 * 1000; // 30 minutes
    const windowMs = baseWindowMs / confidence;

    const earliest = new Date(predictedTime.getTime() - windowMs / 2);
    const latest = new Date(predictedTime.getTime() + windowMs / 2);

    return {
      earliest,
      latest,
      confidence,
      timeUntilOnsetMs: predictedTime.getTime() - Date.now(),
    };
  }

  private calculatePatternMatchScore(
    timeSeries: TimeSeries[],
    pattern: AnomalyPattern,
  ): number {
    // Simplified pattern matching (would use DTW in production)
    let totalScore = 0;
    let count = 0;

    for (const ts of timeSeries) {
      const values = ts.dataPoints.map((p) => p.value);
      const trend = this.calculateTrend(values);
      const volatility = this.calculateVolatility(values);

      // Check if current trend matches pattern characteristics
      const trendMatch = Math.abs(trend) > 0.3 ? 0.5 : 0.2;
      const volatilityMatch = volatility > 0.8 ? 0.5 : 0.2;

      totalScore += trendMatch + volatilityMatch;
      count++;
    }

    return count > 0 ? totalScore / count : 0;
  }

  private maxSeverity(severities: Severity[]): Severity {
    const order = [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL];
    let maxIdx = 0;

    for (const severity of severities) {
      const idx = order.indexOf(severity);
      if (idx > maxIdx) maxIdx = idx;
    }

    return order[maxIdx];
  }
}
