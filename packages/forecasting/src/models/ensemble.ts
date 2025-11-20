/**
 * Ensemble Forecasting Methods
 */

import type { TimeSeriesData, ForecastResult, EnsembleConfig } from '../types/index.js';
import { ARIMAForecaster } from '../core/arima.js';
import { ExponentialSmoothingForecaster } from '../core/exponential-smoothing.js';
import { ProphetForecaster } from '../core/prophet.js';

export class EnsembleForecaster {
  private config: EnsembleConfig;
  private models: Array<{
    forecaster: ARIMAForecaster | ExponentialSmoothingForecaster | ProphetForecaster;
    weight: number;
  }> = [];
  private fitted: boolean = false;

  constructor(config: EnsembleConfig) {
    this.config = config;
    this.initializeModels();
  }

  /**
   * Initialize individual models
   */
  private initializeModels(): void {
    const weights = this.config.weights ||
                   new Array(this.config.models.length).fill(1 / this.config.models.length);

    for (let i = 0; i < this.config.models.length; i++) {
      const modelSpec = this.config.models[i];
      let forecaster: ARIMAForecaster | ExponentialSmoothingForecaster | ProphetForecaster;

      switch (modelSpec.type) {
        case 'arima':
        case 'sarima':
          forecaster = new ARIMAForecaster(modelSpec.params as any);
          break;
        case 'exponential':
          forecaster = new ExponentialSmoothingForecaster(modelSpec.params as any);
          break;
        case 'prophet':
          forecaster = new ProphetForecaster(modelSpec.params as any);
          break;
        default:
          throw new Error(`Unsupported model type: ${modelSpec.type}`);
      }

      this.models.push({
        forecaster,
        weight: weights[i],
      });
    }
  }

  /**
   * Fit all ensemble models
   */
  fit(data: TimeSeriesData[]): void {
    for (const model of this.models) {
      model.forecaster.fit(data);
    }
    this.fitted = true;
  }

  /**
   * Generate ensemble forecasts
   */
  forecast(horizon: number, confidenceLevel: number = 0.95): ForecastResult[] {
    if (!this.fitted) {
      throw new Error('Ensemble must be fitted before forecasting');
    }

    // Get forecasts from all models
    const allForecasts = this.models.map(model =>
      model.forecaster.forecast(horizon, confidenceLevel)
    );

    // Combine forecasts based on method
    if (this.config.method === 'average') {
      return this.averageForecasts(allForecasts);
    } else if (this.config.method === 'weighted') {
      return this.weightedForecasts(allForecasts);
    } else {
      // Stacking would require a meta-model
      return this.weightedForecasts(allForecasts);
    }
  }

  /**
   * Simple average of forecasts
   */
  private averageForecasts(allForecasts: ForecastResult[][]): ForecastResult[] {
    const n = allForecasts[0].length;
    const results: ForecastResult[] = [];

    for (let i = 0; i < n; i++) {
      const forecasts = allForecasts.map(f => f[i].forecast);
      const lowerBounds = allForecasts.map(f => f[i].lowerBound);
      const upperBounds = allForecasts.map(f => f[i].upperBound);

      results.push({
        timestamp: allForecasts[0][i].timestamp,
        forecast: this.mean(forecasts),
        lowerBound: this.mean(lowerBounds),
        upperBound: this.mean(upperBounds),
        confidence: allForecasts[0][i].confidence,
      });
    }

    return results;
  }

  /**
   * Weighted average of forecasts
   */
  private weightedForecasts(allForecasts: ForecastResult[][]): ForecastResult[] {
    const n = allForecasts[0].length;
    const results: ForecastResult[] = [];

    for (let i = 0; i < n; i++) {
      let forecast = 0;
      let lowerBound = 0;
      let upperBound = 0;

      for (let j = 0; j < this.models.length; j++) {
        forecast += allForecasts[j][i].forecast * this.models[j].weight;
        lowerBound += allForecasts[j][i].lowerBound * this.models[j].weight;
        upperBound += allForecasts[j][i].upperBound * this.models[j].weight;
      }

      results.push({
        timestamp: allForecasts[0][i].timestamp,
        forecast,
        lowerBound,
        upperBound,
        confidence: allForecasts[0][i].confidence,
      });
    }

    return results;
  }

  private mean(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}

/**
 * Forecast combination using optimal weights
 */
export class OptimalEnsemble {
  /**
   * Calculate optimal weights using inverse variance weighting
   */
  static calculateOptimalWeights(
    forecasts: ForecastResult[][],
    actualValues: number[]
  ): number[] {
    const n = forecasts.length;
    const variances: number[] = [];

    // Calculate variance for each model
    for (const modelForecasts of forecasts) {
      const errors = modelForecasts.map((f, i) =>
        actualValues[i] ? f.forecast - actualValues[i] : 0
      );
      const variance = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
      variances.push(variance);
    }

    // Inverse variance weights
    const inverseVars = variances.map(v => 1 / (v + 1e-10));
    const sum = inverseVars.reduce((a, b) => a + b, 0);
    return inverseVars.map(iv => iv / sum);
  }
}
