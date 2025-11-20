/**
 * IntelGraph Seasonal Decomposition Package
 * STL, Classical decomposition, and trend analysis
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { mean, median } from 'simple-statistics';

export interface DecompositionResult {
  trend: number[];
  seasonal: number[];
  residual: number[];
  timestamps: Date[];
  method: string;
  seasonality_strength?: number;
  trend_strength?: number;
}

export interface STLConfig {
  period: number;
  seasonal_smoothing?: number;
  trend_smoothing?: number;
  robust?: boolean;
}

export class SeasonalDecomposition {
  /**
   * STL (Seasonal-Trend decomposition using Loess)
   */
  static stlDecomposition(
    data: number[],
    timestamps: Date[],
    config: STLConfig
  ): DecompositionResult {
    const { period, seasonal_smoothing = 7, trend_smoothing = 0, robust = false } = config;

    // Initialize components
    const trend = new Array(data.length).fill(0);
    const seasonal = new Array(data.length).fill(0);
    const residual = new Array(data.length).fill(0);

    // Extract seasonal component
    for (let i = 0; i < data.length; i++) {
      const seasonIndex = i % period;
      const seasonalValues: number[] = [];

      // Collect all values for this season
      for (let j = seasonIndex; j < data.length; j += period) {
        seasonalValues.push(data[j]);
      }

      seasonal[i] = median(seasonalValues);
    }

    // Extract trend using moving average
    const windowSize = Math.min(trend_smoothing || Math.ceil(period * 1.5), data.length);
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(data.length, i + Math.floor(windowSize / 2) + 1);
      const window = data.slice(start, end).map((v, idx) => v - seasonal[start + idx]);
      trend[i] = mean(window);
    }

    // Calculate residuals
    for (let i = 0; i < data.length; i++) {
      residual[i] = data[i] - trend[i] - seasonal[i];
    }

    // Calculate strength metrics
    const seasonality_strength = this.calculateSeasonalityStrength(data, seasonal);
    const trend_strength = this.calculateTrendStrength(data, trend);

    return {
      trend,
      seasonal,
      residual,
      timestamps,
      method: 'STL',
      seasonality_strength,
      trend_strength
    };
  }

  /**
   * Classical additive decomposition
   */
  static additiveDecomposition(
    data: number[],
    timestamps: Date[],
    period: number
  ): DecompositionResult {
    const seasonal = this.extractSeasonalAdditive(data, period);
    const trend = this.extractTrendMovingAverage(data, period);
    const residual = data.map((v, i) => v - trend[i] - seasonal[i]);

    return {
      trend,
      seasonal,
      residual,
      timestamps,
      method: 'additive',
      seasonality_strength: this.calculateSeasonalityStrength(data, seasonal),
      trend_strength: this.calculateTrendStrength(data, trend)
    };
  }

  /**
   * Classical multiplicative decomposition
   */
  static multiplicativeDecomposition(
    data: number[],
    timestamps: Date[],
    period: number
  ): DecompositionResult {
    const trend = this.extractTrendMovingAverage(data, period);
    const detrended = data.map((v, i) => (trend[i] !== 0 ? v / trend[i] : 1));
    const seasonal = this.extractSeasonalAdditive(detrended, period);
    const residual = data.map((v, i) =>
      trend[i] !== 0 && seasonal[i] !== 0 ? v / (trend[i] * seasonal[i]) : 0
    );

    return {
      trend,
      seasonal,
      residual,
      timestamps,
      method: 'multiplicative',
      seasonality_strength: this.calculateSeasonalityStrength(data, seasonal),
      trend_strength: this.calculateTrendStrength(data, trend)
    };
  }

  /**
   * Extract seasonal component (additive)
   */
  private static extractSeasonalAdditive(data: number[], period: number): number[] {
    const seasonal = new Array(data.length).fill(0);
    const seasonalAverages = new Array(period).fill(0);

    // Calculate average for each seasonal position
    for (let s = 0; s < period; s++) {
      const values: number[] = [];
      for (let i = s; i < data.length; i += period) {
        values.push(data[i]);
      }
      seasonalAverages[s] = mean(values);
    }

    // Center seasonal component
    const seasonalMean = mean(seasonalAverages);
    for (let s = 0; s < period; s++) {
      seasonalAverages[s] -= seasonalMean;
    }

    // Assign to full array
    for (let i = 0; i < data.length; i++) {
      seasonal[i] = seasonalAverages[i % period];
    }

    return seasonal;
  }

  /**
   * Extract trend using centered moving average
   */
  private static extractTrendMovingAverage(data: number[], windowSize: number): number[] {
    const trend = new Array(data.length).fill(0);

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(data.length, i + Math.floor(windowSize / 2) + 1);
      trend[i] = mean(data.slice(start, end));
    }

    return trend;
  }

  /**
   * Calculate seasonality strength
   */
  private static calculateSeasonalityStrength(original: number[], seasonal: number[]): number {
    const deseasonalized = original.map((v, i) => v - seasonal[i]);
    const varOriginal = this.variance(original);
    const varDeseasonalized = this.variance(deseasonalized);

    if (varOriginal === 0) return 0;
    return Math.max(0, 1 - varDeseasonalized / varOriginal);
  }

  /**
   * Calculate trend strength
   */
  private static calculateTrendStrength(original: number[], trend: number[]): number {
    const detrended = original.map((v, i) => v - trend[i]);
    const varOriginal = this.variance(original);
    const varDetrended = this.variance(detrended);

    if (varOriginal === 0) return 0;
    return Math.max(0, 1 - varDetrended / varOriginal);
  }

  /**
   * Calculate variance
   */
  private static variance(data: number[]): number {
    const m = mean(data);
    return data.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / data.length;
  }
}
