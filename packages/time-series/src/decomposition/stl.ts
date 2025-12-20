/**
 * STL (Seasonal and Trend decomposition using Loess)
 */

import type { TimeSeriesPoint, SeasonalDecomposition } from '../types/index.js';

export class STLDecomposer {
  private period: number;
  private seasonal: number = 7;
  private trend: number = 15;

  constructor(period: number, seasonal?: number, trend?: number) {
    this.period = period;
    if (seasonal) this.seasonal = seasonal;
    if (trend) this.trend = trend;
  }

  /**
   * Decompose time series into trend, seasonal, and residual components
   */
  decompose(data: TimeSeriesPoint[]): SeasonalDecomposition {
    const values = data.map(d => d.value);
    const n = values.length;

    // Initialize components
    let trend = new Array(n).fill(0);
    let seasonal = new Array(n).fill(0);

    // Iterative STL algorithm
    for (let iter = 0; iter < 2; iter++) {
      // Detrend
      const detrended = values.map((v, i) => v - trend[i]);

      // Extract seasonal component
      seasonal = this.extractSeasonal(detrended);

      // Deseasonalize
      const deseasonalized = values.map((v, i) => v - seasonal[i]);

      // Extract trend using moving average
      trend = this.extractTrend(deseasonalized);
    }

    // Calculate residuals
    const residual = values.map((v, i) => v - trend[i] - seasonal[i]);

    return {
      trend,
      seasonal,
      residual,
      timestamps: data.map(d => d.timestamp),
    };
  }

  /**
   * Extract seasonal component
   */
  private extractSeasonal(data: number[]): number[] {
    const n = data.length;
    const seasonal = new Array(n).fill(0);

    // Average values for each seasonal position
    for (let s = 0; s < this.period; s++) {
      let sum = 0;
      let count = 0;

      for (let i = s; i < n; i += this.period) {
        sum += data[i];
        count++;
      }

      const avgValue = count > 0 ? sum / count : 0;

      for (let i = s; i < n; i += this.period) {
        seasonal[i] = avgValue;
      }
    }

    // Remove mean from seasonal component
    const seasonalMean = seasonal.reduce((a, b) => a + b, 0) / n;
    return seasonal.map(s => s - seasonalMean);
  }

  /**
   * Extract trend using moving average
   */
  private extractTrend(data: number[]): number[] {
    const n = data.length;
    const trend = new Array(n).fill(0);
    const halfWindow = Math.floor(this.trend / 2);

    for (let i = 0; i < n; i++) {
      let sum = 0;
      let count = 0;

      for (let j = Math.max(0, i - halfWindow); j <= Math.min(n - 1, i + halfWindow); j++) {
        sum += data[j];
        count++;
      }

      trend[i] = sum / count;
    }

    return trend;
  }
}
