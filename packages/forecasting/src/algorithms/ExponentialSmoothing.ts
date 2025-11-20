/**
 * IntelGraph Exponential Smoothing (Holt-Winters)
 * Triple exponential smoothing for trend and seasonal forecasting
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import {
  ExponentialSmoothingConfig,
  ForecastPoint,
  ForecastMetrics
} from '../models/ForecastModels.js';

export class ExponentialSmoothing {
  private config: ExponentialSmoothingConfig;
  private level: number = 0;
  private trend: number = 0;
  private seasonal: number[] = [];
  private fitted: boolean = false;

  constructor(config: ExponentialSmoothingConfig) {
    this.config = {
      alpha: 0.2,
      beta: 0.1,
      gamma: 0.1,
      phi: 0.98,
      ...config
    };
  }

  /**
   * Fit Holt-Winters model to data
   */
  async fit(data: number[]): Promise<void> {
    const s = this.config.seasonal_periods || 12;

    // Initialize level (average of first season)
    this.level = data.slice(0, s).reduce((a, b) => a + b, 0) / s;

    // Initialize trend
    if (data.length >= 2 * s) {
      const firstSeason = data.slice(0, s).reduce((a, b) => a + b, 0) / s;
      const secondSeason = data.slice(s, 2 * s).reduce((a, b) => a + b, 0) / s;
      this.trend = (secondSeason - firstSeason) / s;
    } else {
      this.trend = 0;
    }

    // Initialize seasonal components
    if (this.config.seasonal === 'add' || this.config.seasonal === 'mul') {
      this.seasonal = this.initializeSeasonalComponents(data, s);
    }

    // Fit the model
    for (let t = 0; t < data.length; t++) {
      this.update(data[t], t);
    }

    this.fitted = true;
  }

  /**
   * Update model components with new observation
   */
  private update(value: number, t: number): void {
    const s = this.config.seasonal_periods || 12;
    const seasonalIndex = t % s;

    let deseasonalized = value;
    if (this.config.seasonal === 'add') {
      deseasonalized = value - this.seasonal[seasonalIndex];
    } else if (this.config.seasonal === 'mul') {
      deseasonalized = value / (this.seasonal[seasonalIndex] || 1);
    }

    const prevLevel = this.level;
    const prevTrend = this.trend;

    // Update level
    if (this.config.trend) {
      this.level = this.config.alpha! * deseasonalized +
        (1 - this.config.alpha!) * (prevLevel + prevTrend);
    } else {
      this.level = this.config.alpha! * deseasonalized +
        (1 - this.config.alpha!) * prevLevel;
    }

    // Update trend
    if (this.config.trend === 'add') {
      if (this.config.damped_trend) {
        this.trend = this.config.beta! * (this.level - prevLevel) +
          (1 - this.config.beta!) * this.config.phi! * prevTrend;
      } else {
        this.trend = this.config.beta! * (this.level - prevLevel) +
          (1 - this.config.beta!) * prevTrend;
      }
    } else if (this.config.trend === 'mul') {
      const ratio = prevLevel === 0 ? 1 : this.level / prevLevel;
      this.trend = this.config.beta! * ratio +
        (1 - this.config.beta!) * prevTrend;
    }

    // Update seasonal component
    if (this.config.seasonal === 'add') {
      this.seasonal[seasonalIndex] = this.config.gamma! * (value - this.level) +
        (1 - this.config.gamma!) * this.seasonal[seasonalIndex];
    } else if (this.config.seasonal === 'mul') {
      this.seasonal[seasonalIndex] = this.config.gamma! * (value / this.level) +
        (1 - this.config.gamma!) * this.seasonal[seasonalIndex];
    }
  }

  /**
   * Initialize seasonal components
   */
  private initializeSeasonalComponents(data: number[], period: number): number[] {
    const seasonal: number[] = [];
    const numSeasons = Math.floor(data.length / period);

    for (let i = 0; i < period; i++) {
      let sum = 0;
      let count = 0;

      for (let j = 0; j < numSeasons; j++) {
        const index = j * period + i;
        if (index < data.length) {
          sum += data[index];
          count++;
        }
      }

      const seasonAverage = sum / count;
      const overallAverage = data.slice(0, numSeasons * period)
        .reduce((a, b) => a + b, 0) / (numSeasons * period);

      if (this.config.seasonal === 'add') {
        seasonal[i] = seasonAverage - overallAverage;
      } else if (this.config.seasonal === 'mul') {
        seasonal[i] = overallAverage === 0 ? 1 : seasonAverage / overallAverage;
      } else {
        seasonal[i] = 0;
      }
    }

    return seasonal;
  }

  /**
   * Generate forecasts
   */
  async forecast(horizon: number, confidence: number = 0.95): Promise<ForecastPoint[]> {
    if (!this.fitted) {
      throw new Error('Model must be fitted before forecasting');
    }

    const forecasts: ForecastPoint[] = [];
    const s = this.config.seasonal_periods || 12;
    let currentLevel = this.level;
    let currentTrend = this.trend;

    for (let h = 1; h <= horizon; h++) {
      let forecast = currentLevel;

      // Add trend component
      if (this.config.trend === 'add') {
        if (this.config.damped_trend) {
          const dampingSum = (1 - Math.pow(this.config.phi!, h)) / (1 - this.config.phi!);
          forecast += dampingSum * currentTrend;
        } else {
          forecast += h * currentTrend;
        }
      } else if (this.config.trend === 'mul') {
        forecast *= Math.pow(currentTrend, h);
      }

      // Add seasonal component
      const seasonalIndex = (h - 1) % s;
      if (this.config.seasonal === 'add') {
        forecast += this.seasonal[seasonalIndex];
      } else if (this.config.seasonal === 'mul') {
        forecast *= this.seasonal[seasonalIndex];
      }

      // Calculate prediction intervals (simplified)
      const std_error = Math.sqrt(h) * 0.1 * forecast; // Simplified
      const z_score = confidence === 0.95 ? 1.96 : 1.645;

      forecasts.push({
        timestamp: new Date(Date.now() + h * 3600000),
        predicted_value: forecast,
        lower_bound: forecast - z_score * std_error,
        upper_bound: forecast + z_score * std_error,
        confidence,
        prediction_interval: confidence
      });
    }

    return forecasts;
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
   * Optimize smoothing parameters using grid search
   */
  static async optimize(
    data: number[],
    config: Partial<ExponentialSmoothingConfig>
  ): Promise<ExponentialSmoothingConfig> {
    const alphaValues = [0.1, 0.2, 0.3, 0.4, 0.5];
    const betaValues = [0.05, 0.1, 0.15, 0.2];
    const gammaValues = [0.05, 0.1, 0.15, 0.2];

    let bestConfig = { ...config } as ExponentialSmoothingConfig;
    let bestRMSE = Infinity;

    // Split data for validation
    const splitPoint = Math.floor(data.length * 0.8);
    const trainData = data.slice(0, splitPoint);
    const validData = data.slice(splitPoint);

    for (const alpha of alphaValues) {
      for (const beta of betaValues) {
        for (const gamma of gammaValues) {
          try {
            const testConfig: ExponentialSmoothingConfig = {
              ...config,
              alpha,
              beta,
              gamma
            };

            const model = new ExponentialSmoothing(testConfig);
            await model.fit(trainData);

            const forecasts = await model.forecast(validData.length);
            const predicted = forecasts.map(f => f.predicted_value);
            const metrics = model.calculateMetrics(validData, predicted);

            if (metrics.rmse! < bestRMSE) {
              bestRMSE = metrics.rmse!;
              bestConfig = testConfig;
            }
          } catch (error) {
            continue;
          }
        }
      }
    }

    return bestConfig;
  }
}
