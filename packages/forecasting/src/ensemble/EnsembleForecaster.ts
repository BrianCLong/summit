/**
 * IntelGraph Ensemble Forecasting
 * Combine multiple forecasting models for improved accuracy
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import {
  EnsembleConfig,
  ForecastPoint,
  ForecastMetrics,
  Forecast
} from '../models/ForecastModels.js';
import { ARIMA } from '../algorithms/ARIMA.js';
import { ExponentialSmoothing } from '../algorithms/ExponentialSmoothing.js';

export class EnsembleForecaster {
  private config: EnsembleConfig;
  private models: any[] = [];
  private fitted: boolean = false;

  constructor(config: EnsembleConfig) {
    this.config = config;
  }

  /**
   * Fit all ensemble models
   */
  async fit(data: number[]): Promise<void> {
    this.models = [];

    for (const modelConfig of this.config.models) {
      let model: any;

      switch (modelConfig.model_type) {
        case 'arima':
        case 'sarima':
          model = new ARIMA(modelConfig.hyperparameters as any);
          break;

        case 'exponential_smoothing':
          model = new ExponentialSmoothing(modelConfig.hyperparameters as any);
          break;

        default:
          throw new Error(`Unsupported model type: ${modelConfig.model_type}`);
      }

      await model.fit(data);
      this.models.push(model);
    }

    this.fitted = true;
  }

  /**
   * Generate ensemble forecast
   */
  async forecast(horizon: number, confidence: number = 0.95): Promise<ForecastPoint[]> {
    if (!this.fitted) {
      throw new Error('Ensemble must be fitted before forecasting');
    }

    // Get forecasts from all models
    const allForecasts: ForecastPoint[][] = [];
    for (const model of this.models) {
      const modelForecast = await model.forecast(horizon, confidence);
      allForecasts.push(modelForecast);
    }

    // Combine forecasts
    return this.combineForecasts(allForecasts);
  }

  /**
   * Combine forecasts using specified method
   */
  private combineForecasts(forecasts: ForecastPoint[][]): ForecastPoint[] {
    const horizon = forecasts[0].length;
    const combined: ForecastPoint[] = [];

    for (let h = 0; h < horizon; h++) {
      const values = forecasts.map(f => f[h].predicted_value);
      const lowerBounds = forecasts.map(f => f[h].lower_bound || 0);
      const upperBounds = forecasts.map(f => f[h].upper_bound || 0);

      let combinedValue: number;
      let combinedLower: number;
      let combinedUpper: number;

      switch (this.config.combination_method) {
        case 'weighted_average':
          combinedValue = this.weightedAverage(values, this.config.weights);
          combinedLower = this.weightedAverage(lowerBounds, this.config.weights);
          combinedUpper = this.weightedAverage(upperBounds, this.config.weights);
          break;

        case 'median':
          combinedValue = this.median(values);
          combinedLower = this.median(lowerBounds);
          combinedUpper = this.median(upperBounds);
          break;

        case 'average':
        default:
          combinedValue = this.average(values);
          combinedLower = this.average(lowerBounds);
          combinedUpper = this.average(upperBounds);
          break;
      }

      combined.push({
        timestamp: forecasts[0][h].timestamp,
        predicted_value: combinedValue,
        lower_bound: combinedLower,
        upper_bound: combinedUpper,
        confidence: forecasts[0][h].confidence
      });
    }

    return combined;
  }

  /**
   * Calculate weighted average
   */
  private weightedAverage(values: number[], weights?: number[]): number {
    if (!weights || weights.length !== values.length) {
      return this.average(values);
    }

    const sum = values.reduce((acc, val, i) => acc + val * weights[i], 0);
    const weightSum = weights.reduce((acc, w) => acc + w, 0);
    return sum / weightSum;
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate median
   */
  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Calculate ensemble metrics
   */
  calculateMetrics(actual: number[], predicted: number[]): ForecastMetrics {
    if (actual.length !== predicted.length) {
      throw new Error('Actual and predicted arrays must have same length');
    }

    const n = actual.length;
    let sumAbsError = 0;
    let sumSquaredError = 0;
    let sumPercentError = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - predicted[i];
      sumAbsError += Math.abs(error);
      sumSquaredError += error * error;

      if (actual[i] !== 0) {
        sumPercentError += Math.abs(error / actual[i]);
      }
    }

    return {
      mae: sumAbsError / n,
      rmse: Math.sqrt(sumSquaredError / n),
      mape: (sumPercentError / n) * 100
    };
  }

  /**
   * Optimize ensemble weights using validation data
   */
  async optimizeWeights(
    trainData: number[],
    validData: number[]
  ): Promise<number[]> {
    const nModels = this.models.length;
    let bestWeights = Array(nModels).fill(1 / nModels);
    let bestRMSE = Infinity;

    // Simple grid search for weights
    const steps = 5;
    const searchSpace = this.generateWeightCombinations(nModels, steps);

    for (const weights of searchSpace) {
      // Get individual model forecasts
      const allForecasts: ForecastPoint[][] = [];
      for (const model of this.models) {
        const modelForecast = await model.forecast(validData.length);
        allForecasts.push(modelForecast);
      }

      // Combine with current weights
      const tempConfig = { ...this.config, weights };
      const tempEnsemble = new EnsembleForecaster(tempConfig);
      tempEnsemble.models = this.models;
      tempEnsemble.fitted = true;

      const combined = tempEnsemble.combineForecasts(allForecasts);
      const predicted = combined.map(f => f.predicted_value);
      const metrics = this.calculateMetrics(validData, predicted);

      if (metrics.rmse! < bestRMSE) {
        bestRMSE = metrics.rmse!;
        bestWeights = weights;
      }
    }

    this.config.weights = bestWeights;
    return bestWeights;
  }

  /**
   * Generate weight combinations for optimization
   */
  private generateWeightCombinations(nModels: number, steps: number): number[][] {
    const combinations: number[][] = [];
    const stepSize = 1 / steps;

    // Generate all combinations that sum to 1
    const generate = (current: number[], remaining: number, depth: number) => {
      if (depth === nModels - 1) {
        current.push(remaining);
        combinations.push([...current]);
        current.pop();
        return;
      }

      for (let i = 0; i <= steps; i++) {
        const weight = i * stepSize;
        if (weight <= remaining) {
          current.push(weight);
          generate(current, remaining - weight, depth + 1);
          current.pop();
        }
      }
    };

    generate([], 1.0, 0);
    return combinations;
  }

  /**
   * Get individual model performances
   */
  async getModelPerformances(
    validData: number[]
  ): Promise<Array<{ modelType: string; metrics: ForecastMetrics }>> {
    const performances: Array<{ modelType: string; metrics: ForecastMetrics }> = [];

    for (let i = 0; i < this.models.length; i++) {
      const model = this.models[i];
      const config = this.config.models[i];
      const forecasts = await model.forecast(validData.length);
      const predicted = forecasts.map((f: ForecastPoint) => f.predicted_value);
      const metrics = model.calculateMetrics(validData, predicted);

      performances.push({
        modelType: config.model_type,
        metrics
      });
    }

    return performances;
  }
}
