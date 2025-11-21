/**
 * Automated Feature Generation
 */

import type { FeatureSet } from '../types/index.js';

export class AutomatedFeatureGenerator {
  /**
   * Generate polynomial features
   */
  generatePolynomialFeatures(
    data: number[][],
    degree: number = 2
  ): FeatureSet {
    const features: number[][] = [];
    const featureNames: string[] = [];
    const nFeatures = data[0].length;

    for (const sample of data) {
      const newFeatures: number[] = [...sample];

      // Add polynomial features
      if (degree >= 2) {
        // Quadratic terms
        for (let i = 0; i < nFeatures; i++) {
          newFeatures.push(sample[i] ** 2);
          if (featureNames.length === 0) {
            featureNames.push(`x${i}^2`);
          }
        }

        // Interaction terms
        for (let i = 0; i < nFeatures; i++) {
          for (let j = i + 1; j < nFeatures; j++) {
            newFeatures.push(sample[i] * sample[j]);
            if (featureNames.length < newFeatures.length) {
              featureNames.push(`x${i}*x${j}`);
            }
          }
        }
      }

      features.push(newFeatures);
    }

    return { features, featureNames };
  }

  /**
   * Generate time-based features
   */
  generateTimeFeatures(timestamps: Date[]): FeatureSet {
    const features: number[][] = [];
    const featureNames = [
      'hour',
      'day_of_week',
      'day_of_month',
      'month',
      'quarter',
      'is_weekend',
      'hour_sin',
      'hour_cos',
      'day_sin',
      'day_cos',
    ];

    for (const ts of timestamps) {
      const hour = ts.getHours();
      const dayOfWeek = ts.getDay();
      const dayOfMonth = ts.getDate();
      const month = ts.getMonth();
      const quarter = Math.floor(month / 3);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;

      // Cyclic encoding
      const hourSin = Math.sin(2 * Math.PI * hour / 24);
      const hourCos = Math.cos(2 * Math.PI * hour / 24);
      const daySin = Math.sin(2 * Math.PI * dayOfWeek / 7);
      const dayCos = Math.cos(2 * Math.PI * dayOfWeek / 7);

      features.push([
        hour,
        dayOfWeek,
        dayOfMonth,
        month,
        quarter,
        isWeekend,
        hourSin,
        hourCos,
        daySin,
        dayCos,
      ]);
    }

    return { features, featureNames };
  }

  /**
   * Generate lag features for time series
   */
  generateLagFeatures(
    data: number[],
    lags: number[]
  ): FeatureSet {
    const features: number[][] = [];
    const featureNames = lags.map(l => `lag_${l}`);

    const maxLag = Math.max(...lags);

    for (let i = maxLag; i < data.length; i++) {
      const lagFeatures = lags.map(lag => data[i - lag]);
      features.push(lagFeatures);
    }

    return { features, featureNames };
  }

  /**
   * Generate rolling statistics features
   */
  generateRollingFeatures(
    data: number[],
    windows: number[]
  ): FeatureSet {
    const features: number[][] = [];
    const featureNames: string[] = [];

    for (const window of windows) {
      featureNames.push(`rolling_mean_${window}`);
      featureNames.push(`rolling_std_${window}`);
      featureNames.push(`rolling_min_${window}`);
      featureNames.push(`rolling_max_${window}`);
    }

    const maxWindow = Math.max(...windows);

    for (let i = maxWindow - 1; i < data.length; i++) {
      const rowFeatures: number[] = [];

      for (const window of windows) {
        const windowData = data.slice(i - window + 1, i + 1);
        rowFeatures.push(this.mean(windowData));
        rowFeatures.push(this.std(windowData));
        rowFeatures.push(Math.min(...windowData));
        rowFeatures.push(Math.max(...windowData));
      }

      features.push(rowFeatures);
    }

    return { features, featureNames };
  }

  private mean(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private std(arr: number[]): number {
    const avg = this.mean(arr);
    const squareDiffs = arr.map(x => Math.pow(x - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }
}
