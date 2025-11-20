/**
 * IntelGraph ARIMA/SARIMA Forecasting
 * AutoRegressive Integrated Moving Average models for time series forecasting
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { mean, std } from 'mathjs';
import {
  ARIMAConfig,
  Forecast,
  ForecastPoint,
  ForecastMetrics
} from '../models/ForecastModels.js';

export class ARIMA {
  private config: ARIMAConfig;
  private model: any;
  private fitted: boolean = false;

  constructor(config: ARIMAConfig) {
    this.config = config;
  }

  /**
   * Fit ARIMA model to training data
   */
  async fit(data: number[], timestamps?: Date[]): Promise<void> {
    // Implement ARIMA parameter estimation
    // This is a placeholder - in production, use a library like 'arima' or call Python statsmodels

    // Step 1: Differencing (d times)
    let differenced = this.difference(data, this.config.d);

    // Step 2: Estimate AR parameters (p)
    const arParams = this.estimateARParameters(differenced, this.config.p);

    // Step 3: Estimate MA parameters (q)
    const maParams = this.estimateMAParameters(differenced, this.config.q);

    // Store model parameters
    this.model = {
      ar_params: arParams,
      ma_params: maParams,
      original_data: data,
      mean: mean(data),
      std: std(data, 'uncorrected') as number
    };

    this.fitted = true;
  }

  /**
   * Generate forecasts for future time periods
   */
  async forecast(horizon: number, confidence: number = 0.95): Promise<ForecastPoint[]> {
    if (!this.fitted) {
      throw new Error('Model must be fitted before forecasting');
    }

    const forecasts: ForecastPoint[] = [];
    const data = [...this.model.original_data];
    const z_score = this.getZScore(confidence);

    for (let h = 0; h < horizon; h++) {
      // Generate point forecast
      const prediction = this.predictNext(data);

      // Calculate prediction interval
      const std_error = this.model.std * Math.sqrt(h + 1);
      const lower_bound = prediction - z_score * std_error;
      const upper_bound = prediction + z_score * std_error;

      forecasts.push({
        timestamp: new Date(Date.now() + (h + 1) * 3600000), // Placeholder: 1 hour intervals
        predicted_value: prediction,
        lower_bound,
        upper_bound,
        confidence,
        prediction_interval: confidence
      });

      // Add prediction to data for next iteration
      data.push(prediction);
    }

    return forecasts;
  }

  /**
   * Predict next value using AR and MA components
   */
  private predictNext(data: number[]): number {
    const { ar_params, ma_params, mean } = this.model;
    let prediction = mean;

    // AR component
    for (let i = 0; i < ar_params.length; i++) {
      const index = data.length - 1 - i;
      if (index >= 0) {
        prediction += ar_params[i] * (data[index] - mean);
      }
    }

    // MA component (simplified - would need residuals in full implementation)
    for (let i = 0; i < ma_params.length; i++) {
      const index = data.length - 1 - i;
      if (index >= 0) {
        const residual = 0; // Placeholder
        prediction += ma_params[i] * residual;
      }
    }

    return prediction;
  }

  /**
   * Apply differencing to make series stationary
   */
  private difference(data: number[], order: number): number[] {
    let result = [...data];
    for (let d = 0; d < order; d++) {
      const temp: number[] = [];
      for (let i = 1; i < result.length; i++) {
        temp.push(result[i] - result[i - 1]);
      }
      result = temp;
    }
    return result;
  }

  /**
   * Estimate AR parameters using Yule-Walker equations
   */
  private estimateARParameters(data: number[], p: number): number[] {
    // Simplified implementation - calculate autocorrelations
    const params: number[] = [];
    for (let lag = 1; lag <= p; lag++) {
      params.push(this.autocorrelation(data, lag));
    }
    return params;
  }

  /**
   * Estimate MA parameters using moment matching
   */
  private estimateMAParameters(data: number[], q: number): number[] {
    // Simplified implementation
    const params: number[] = [];
    for (let lag = 1; lag <= q; lag++) {
      params.push(this.autocorrelation(data, lag) * 0.5); // Simplified
    }
    return params;
  }

  /**
   * Calculate autocorrelation at given lag
   */
  private autocorrelation(data: number[], lag: number): number {
    const n = data.length;
    const dataMean = mean(data);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n - lag; i++) {
      numerator += (data[i] - dataMean) * (data[i + lag] - dataMean);
    }

    for (let i = 0; i < n; i++) {
      denominator += Math.pow(data[i] - dataMean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Get z-score for confidence interval
   */
  private getZScore(confidence: number): number {
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };
    return zScores[confidence] || 1.96;
  }

  /**
   * Calculate forecast accuracy metrics
   */
  calculateMetrics(actual: number[], predicted: number[]): ForecastMetrics {
    if (actual.length !== predicted.length) {
      throw new Error('Actual and predicted arrays must have same length');
    }

    const n = actual.length;
    let sumAbsError = 0;
    let sumSquaredError = 0;
    let sumPercentError = 0;
    let sumActual = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - predicted[i];
      sumAbsError += Math.abs(error);
      sumSquaredError += error * error;

      if (actual[i] !== 0) {
        sumPercentError += Math.abs(error / actual[i]);
      }

      sumActual += actual[i];
    }

    const mae = sumAbsError / n;
    const rmse = Math.sqrt(sumSquaredError / n);
    const mape = (sumPercentError / n) * 100;

    // Calculate R-squared
    const meanActual = mean(actual);
    let ssTot = 0;
    for (const val of actual) {
      ssTot += Math.pow(val - meanActual, 2);
    }
    const r_squared = ssTot === 0 ? 0 : 1 - (sumSquaredError / ssTot);

    return {
      mae,
      rmse,
      mape,
      r_squared
    };
  }

  /**
   * Perform grid search for optimal ARIMA parameters
   */
  static async autoFit(
    data: number[],
    maxP: number = 5,
    maxD: number = 2,
    maxQ: number = 5
  ): Promise<{ config: ARIMAConfig; metrics: ForecastMetrics }> {
    let bestConfig: ARIMAConfig = { p: 1, d: 1, q: 1 };
    let bestAIC = Infinity;

    // Split data into train and validation
    const splitPoint = Math.floor(data.length * 0.8);
    const trainData = data.slice(0, splitPoint);
    const validData = data.slice(splitPoint);

    for (let p = 0; p <= maxP; p++) {
      for (let d = 0; d <= maxD; d++) {
        for (let q = 0; q <= maxQ; q++) {
          try {
            const config: ARIMAConfig = { p, d, q };
            const model = new ARIMA(config);
            await model.fit(trainData);

            const forecasts = await model.forecast(validData.length);
            const predicted = forecasts.map(f => f.predicted_value);
            const metrics = model.calculateMetrics(validData, predicted);

            // Use AIC-like criterion (simplified)
            const aic = 2 * (p + d + q) + trainData.length * Math.log(metrics.rmse);

            if (aic < bestAIC) {
              bestAIC = aic;
              bestConfig = config;
            }
          } catch (error) {
            // Skip invalid configurations
            continue;
          }
        }
      }
    }

    // Refit with best parameters
    const finalModel = new ARIMA(bestConfig);
    await finalModel.fit(data);
    const forecasts = await finalModel.forecast(validData.length);
    const predicted = forecasts.map(f => f.predicted_value);
    const metrics = finalModel.calculateMetrics(validData, predicted);

    return { config: bestConfig, metrics };
  }
}
