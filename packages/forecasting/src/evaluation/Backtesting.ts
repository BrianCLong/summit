/**
 * IntelGraph Forecast Backtesting
 * Time series cross-validation and model evaluation
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import {
  BacktestConfig,
  BacktestResult,
  BacktestSplit,
  ForecastMetrics,
  ForecastConfig
} from '../models/ForecastModels.js';
import { ARIMA } from '../algorithms/ARIMA.js';
import { ExponentialSmoothing } from '../algorithms/ExponentialSmoothing.js';

export class Backtesting {
  /**
   * Perform time series cross-validation
   */
  static async timeSeriesCrossValidation(
    data: number[],
    timestamps: Date[],
    modelConfig: ForecastConfig,
    backtestConfig: BacktestConfig
  ): Promise<BacktestResult> {
    const splits = this.generateSplits(data, timestamps, backtestConfig);
    const splitResults: BacktestSplit[] = [];

    for (const split of splits) {
      const trainData = data.slice(0, split.trainEndIndex);
      const testData = data.slice(split.testStartIndex, split.testEndIndex + 1);

      // Fit model on training data
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

      await model.fit(trainData);

      // Generate forecasts
      const forecasts = await model.forecast(testData.length);
      const predicted = forecasts.map((f: any) => f.predicted_value);

      // Calculate metrics
      const metrics = model.calculateMetrics(testData, predicted);

      splitResults.push({
        split_number: splitResults.length + 1,
        training_end: timestamps[split.trainEndIndex],
        test_start: timestamps[split.testStartIndex],
        test_end: timestamps[split.testEndIndex],
        predictions: forecasts,
        actuals: testData,
        metrics
      });
    }

    // Calculate average metrics
    const averageMetrics = this.calculateAverageMetrics(splitResults);

    return {
      config: backtestConfig,
      splits: splitResults,
      average_metrics: averageMetrics
    };
  }

  /**
   * Generate time series splits for cross-validation
   */
  private static generateSplits(
    data: number[],
    timestamps: Date[],
    config: BacktestConfig
  ): Array<{ trainEndIndex: number; testStartIndex: number; testEndIndex: number }> {
    const splits: Array<{ trainEndIndex: number; testStartIndex: number; testEndIndex: number }> = [];
    const stepSize = config.step_size || config.horizon;
    const nSplits = config.n_splits || Math.floor((data.length - config.initial_training_size) / stepSize);

    for (let i = 0; i < nSplits; i++) {
      const trainEndIndex = config.initial_training_size + i * stepSize - 1;
      const testStartIndex = trainEndIndex + 1;
      const testEndIndex = Math.min(testStartIndex + config.horizon - 1, data.length - 1);

      if (testEndIndex >= data.length) break;

      splits.push({
        trainEndIndex,
        testStartIndex,
        testEndIndex
      });
    }

    return splits;
  }

  /**
   * Calculate average metrics across all splits
   */
  private static calculateAverageMetrics(splits: BacktestSplit[]): ForecastMetrics {
    const n = splits.length;
    let sumMAE = 0;
    let sumRMSE = 0;
    let sumMAPE = 0;

    for (const split of splits) {
      sumMAE += split.metrics.mae || 0;
      sumRMSE += split.metrics.rmse || 0;
      sumMAPE += split.metrics.mape || 0;
    }

    return {
      mae: sumMAE / n,
      rmse: sumRMSE / n,
      mape: sumMAPE / n
    };
  }

  /**
   * Perform walk-forward validation
   */
  static async walkForwardValidation(
    data: number[],
    timestamps: Date[],
    modelConfig: ForecastConfig,
    windowSize: number,
    stepSize: number = 1
  ): Promise<BacktestResult> {
    const splits: BacktestSplit[] = [];
    let currentIndex = windowSize;

    while (currentIndex + stepSize <= data.length) {
      const trainData = data.slice(currentIndex - windowSize, currentIndex);
      const testData = data.slice(currentIndex, currentIndex + stepSize);

      // Fit and forecast
      let model: any;
      switch (modelConfig.model_type) {
        case 'arima':
          model = new ARIMA(modelConfig.hyperparameters as any);
          break;
        case 'exponential_smoothing':
          model = new ExponentialSmoothing(modelConfig.hyperparameters as any);
          break;
        default:
          throw new Error(`Unsupported model type: ${modelConfig.model_type}`);
      }

      await model.fit(trainData);
      const forecasts = await model.forecast(testData.length);
      const predicted = forecasts.map((f: any) => f.predicted_value);
      const metrics = model.calculateMetrics(testData, predicted);

      splits.push({
        split_number: splits.length + 1,
        training_end: timestamps[currentIndex - 1],
        test_start: timestamps[currentIndex],
        test_end: timestamps[currentIndex + stepSize - 1],
        predictions: forecasts,
        actuals: testData,
        metrics
      });

      currentIndex += stepSize;
    }

    return {
      config: {
        initial_training_size: windowSize,
        horizon: stepSize,
        step_size: stepSize,
        n_splits: splits.length
      },
      splits,
      average_metrics: this.calculateAverageMetrics(splits)
    };
  }

  /**
   * Calculate residual diagnostics
   */
  static calculateResidualDiagnostics(
    actual: number[],
    predicted: number[]
  ): {
    residuals: number[];
    mean: number;
    std: number;
    autocorrelation: number[];
    is_stationary: boolean;
  } {
    const residuals = actual.map((a, i) => a - predicted[i]);
    const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    const variance = residuals.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / residuals.length;
    const std = Math.sqrt(variance);

    // Calculate autocorrelations
    const autocorrelation: number[] = [];
    for (let lag = 1; lag <= Math.min(20, Math.floor(residuals.length / 4)); lag++) {
      let sum = 0;
      for (let i = 0; i < residuals.length - lag; i++) {
        sum += (residuals[i] - mean) * (residuals[i + lag] - mean);
      }
      autocorrelation.push(sum / (variance * (residuals.length - lag)));
    }

    // Simple stationarity check (Ljung-Box-like)
    const is_stationary = autocorrelation.every(ac => Math.abs(ac) < 0.2);

    return {
      residuals,
      mean,
      std,
      autocorrelation,
      is_stationary
    };
  }

  /**
   * Compare multiple models using backtesting
   */
  static async compareModels(
    data: number[],
    timestamps: Date[],
    modelConfigs: ForecastConfig[],
    backtestConfig: BacktestConfig
  ): Promise<Array<{ config: ForecastConfig; results: BacktestResult }>> {
    const comparisons: Array<{ config: ForecastConfig; results: BacktestResult }> = [];

    for (const config of modelConfigs) {
      const results = await this.timeSeriesCrossValidation(
        data,
        timestamps,
        config,
        backtestConfig
      );

      comparisons.push({ config, results });
    }

    // Sort by average RMSE
    comparisons.sort((a, b) =>
      (a.results.average_metrics.rmse || 0) - (b.results.average_metrics.rmse || 0)
    );

    return comparisons;
  }
}
