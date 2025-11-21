/**
 * Stationarity Tests (Augmented Dickey-Fuller)
 */

import type { TimeSeriesPoint, StationarityTest } from '../types/index.js';

export class StationarityTester {
  /**
   * Augmented Dickey-Fuller test
   */
  adfTest(data: TimeSeriesPoint[], lags: number = 1): StationarityTest {
    const values = data.map(d => d.value);
    const n = values.length;

    // Calculate first differences
    const diff = values.slice(1).map((v, i) => v - values[i]);

    // Build regression model
    const y = diff.slice(lags);
    const x = values.slice(lags, -1);

    // Simple OLS regression
    const { coefficient, tStatistic } = this.ols(y, x);

    // Critical values (approximate)
    const criticalValues = {
      '1%': -3.43,
      '5%': -2.86,
      '10%': -2.57,
    };

    const isStationary = tStatistic < criticalValues['5%'];
    const pValue = this.calculatePValue(tStatistic);

    return {
      isStationary,
      pValue,
      testStatistic: tStatistic,
      criticalValues,
    };
  }

  /**
   * KPSS test for stationarity
   */
  kpssTest(data: TimeSeriesPoint[]): StationarityTest {
    const values = data.map(d => d.value);
    const n = values.length;

    // Detrend the series
    const trend = this.linearTrend(values);
    const residuals = values.map((v, i) => v - trend[i]);

    // Calculate cumulative sum of residuals
    const cumSum = residuals.reduce((acc, r) => {
      const last = acc.length > 0 ? acc[acc.length - 1] : 0;
      acc.push(last + r);
      return acc;
    }, [] as number[]);

    // Calculate test statistic
    const s2 = residuals.reduce((sum, r) => sum + r * r, 0) / n;
    const eta = cumSum.reduce((sum, cs) => sum + cs * cs, 0) / (n * n);
    const testStatistic = eta / s2;

    // Critical values
    const criticalValues = {
      '1%': 0.739,
      '5%': 0.463,
      '10%': 0.347,
    };

    const isStationary = testStatistic < criticalValues['5%'];

    return {
      isStationary,
      pValue: testStatistic < criticalValues['5%'] ? 0.05 : 0.1,
      testStatistic,
      criticalValues,
    };
  }

  /**
   * Simple OLS regression
   */
  private ols(y: number[], x: number[]): { coefficient: number; tStatistic: number } {
    const n = y.length;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (y[i] - meanY);
      denominator += (x[i] - meanX) * (x[i] - meanX);
    }

    const coefficient = numerator / denominator;

    // Calculate standard error
    const residuals = y.map((yi, i) => yi - coefficient * x[i]);
    const sse = residuals.reduce((sum, r) => sum + r * r, 0);
    const mse = sse / (n - 1);
    const se = Math.sqrt(mse / denominator);

    const tStatistic = coefficient / se;

    return { coefficient, tStatistic };
  }

  /**
   * Calculate p-value (approximate)
   */
  private calculatePValue(tStat: number): number {
    if (tStat < -3.43) return 0.01;
    if (tStat < -2.86) return 0.05;
    if (tStat < -2.57) return 0.10;
    return 0.20;
  }

  /**
   * Calculate linear trend
   */
  private linearTrend(values: number[]): number[] {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return x.map(xi => intercept + slope * xi);
  }
}
