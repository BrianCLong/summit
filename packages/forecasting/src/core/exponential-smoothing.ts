/**
 * Exponential Smoothing Methods (Holt-Winters)
 */

import type { TimeSeriesData, ForecastResult, ExponentialSmoothingParams } from '../types/index.js';

export class ExponentialSmoothingForecaster {
  private params: ExponentialSmoothingParams;
  private level: number = 0;
  private trend: number = 0;
  private seasonal: number[] = [];
  private fitted: boolean = false;

  constructor(params: ExponentialSmoothingParams = {}) {
    this.params = {
      alpha: params.alpha || 0.2,
      beta: params.beta || 0.1,
      gamma: params.gamma || 0.1,
      seasonalPeriods: params.seasonalPeriods || 12,
      trendType: params.trendType || 'additive',
      seasonalType: params.seasonalType || 'additive',
      dampedTrend: params.dampedTrend || false,
    };
  }

  /**
   * Fit the exponential smoothing model
   */
  fit(data: TimeSeriesData[]): void {
    const values = data.map(d => d.value);
    const n = values.length;

    // Initialize components
    this.initializeComponents(values);

    // Update components iteratively
    for (let t = 0; t < n; t++) {
      this.updateComponents(values, t);
    }

    this.fitted = true;
  }

  /**
   * Generate forecasts
   */
  forecast(horizon: number, confidenceLevel: number = 0.95): ForecastResult[] {
    if (!this.fitted) {
      throw new Error('Model must be fitted before forecasting');
    }

    const results: ForecastResult[] = [];
    const variance = this.estimateVariance();
    const zScore = this.getZScore(confidenceLevel);

    for (let h = 1; h <= horizon; h++) {
      const forecast = this.forecastOneStep(h);
      const margin = zScore * Math.sqrt(variance * h);

      results.push({
        timestamp: new Date(), // Would need actual timestamp logic
        forecast,
        lowerBound: forecast - margin,
        upperBound: forecast + margin,
        confidence: confidenceLevel,
      });
    }

    return results;
  }

  /**
   * Initialize level, trend, and seasonal components
   */
  private initializeComponents(values: number[]): void {
    const s = this.params.seasonalPeriods!;

    // Initialize level as mean of first season
    this.level = values.slice(0, s).reduce((a, b) => a + b, 0) / s;

    // Initialize trend
    if (this.params.trendType !== 'none') {
      let trendSum = 0;
      for (let i = 0; i < s && i + s < values.length; i++) {
        trendSum += (values[i + s] - values[i]) / s;
      }
      this.trend = trendSum / s;
    }

    // Initialize seasonal components
    if (this.params.seasonalType !== 'none') {
      this.seasonal = new Array(s).fill(0);
      for (let i = 0; i < s; i++) {
        let seasonalSum = 0;
        let count = 0;
        for (let j = i; j < values.length; j += s) {
          if (this.params.seasonalType === 'additive') {
            seasonalSum += values[j] - this.level;
          } else {
            seasonalSum += values[j] / this.level;
          }
          count++;
        }
        this.seasonal[i] = seasonalSum / count;
      }

      // Normalize seasonal components
      if (this.params.seasonalType === 'additive') {
        const seasonalMean = this.seasonal.reduce((a, b) => a + b, 0) / s;
        this.seasonal = this.seasonal.map(s => s - seasonalMean);
      } else {
        const seasonalMean = this.seasonal.reduce((a, b) => a + b, 0) / s;
        this.seasonal = this.seasonal.map(s => s / seasonalMean);
      }
    }
  }

  /**
   * Update components for time t
   */
  private updateComponents(values: number[], t: number): void {
    const alpha = this.params.alpha!;
    const beta = this.params.beta!;
    const gamma = this.params.gamma!;
    const s = this.params.seasonalPeriods!;

    const seasonalIdx = t % s;
    const prevLevel = this.level;
    const prevTrend = this.trend;

    // Update level
    if (this.params.seasonalType === 'additive') {
      this.level = alpha * (values[t] - this.seasonal[seasonalIdx]) +
                   (1 - alpha) * (prevLevel + prevTrend);
    } else if (this.params.seasonalType === 'multiplicative') {
      this.level = alpha * (values[t] / this.seasonal[seasonalIdx]) +
                   (1 - alpha) * (prevLevel + prevTrend);
    } else {
      this.level = alpha * values[t] + (1 - alpha) * (prevLevel + prevTrend);
    }

    // Update trend
    if (this.params.trendType === 'additive') {
      this.trend = beta * (this.level - prevLevel) + (1 - beta) * prevTrend;
    } else if (this.params.trendType === 'multiplicative') {
      this.trend = beta * (this.level / prevLevel) + (1 - beta) * prevTrend;
    }

    // Apply damping if enabled
    if (this.params.dampedTrend && this.params.trendType !== 'none') {
      this.trend *= 0.98; // Damping factor
    }

    // Update seasonal component
    if (this.params.seasonalType === 'additive') {
      this.seasonal[seasonalIdx] = gamma * (values[t] - this.level) +
                                   (1 - gamma) * this.seasonal[seasonalIdx];
    } else if (this.params.seasonalType === 'multiplicative') {
      this.seasonal[seasonalIdx] = gamma * (values[t] / this.level) +
                                   (1 - gamma) * this.seasonal[seasonalIdx];
    }
  }

  /**
   * Forecast one step ahead
   */
  private forecastOneStep(h: number): number {
    const s = this.params.seasonalPeriods!;
    const seasonalIdx = (h - 1) % s;

    let forecast = this.level;

    // Add trend component
    if (this.params.trendType === 'additive') {
      forecast += h * this.trend;
    } else if (this.params.trendType === 'multiplicative') {
      forecast *= Math.pow(this.trend, h);
    }

    // Add seasonal component
    if (this.params.seasonalType === 'additive') {
      forecast += this.seasonal[seasonalIdx];
    } else if (this.params.seasonalType === 'multiplicative') {
      forecast *= this.seasonal[seasonalIdx];
    }

    return forecast;
  }

  /**
   * Estimate forecast variance
   */
  private estimateVariance(): number {
    // Simplified variance estimation
    return 1.0; // Would calculate from residuals in practice
  }

  /**
   * Get z-score for confidence level
   */
  private getZScore(confidenceLevel: number): number {
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };
    return zScores[confidenceLevel] || 1.96;
  }
}

/**
 * Simple Exponential Smoothing (SES)
 */
export class SimpleExponentialSmoothing {
  private alpha: number;
  private level: number = 0;

  constructor(alpha: number = 0.2) {
    this.alpha = alpha;
  }

  fit(data: TimeSeriesData[]): void {
    const values = data.map(d => d.value);
    this.level = values[0];

    for (let t = 1; t < values.length; t++) {
      this.level = this.alpha * values[t] + (1 - this.alpha) * this.level;
    }
  }

  forecast(horizon: number): ForecastResult[] {
    const results: ForecastResult[] = [];

    for (let h = 1; h <= horizon; h++) {
      results.push({
        timestamp: new Date(),
        forecast: this.level,
        lowerBound: this.level * 0.9,
        upperBound: this.level * 1.1,
        confidence: 0.95,
      });
    }

    return results;
  }
}
