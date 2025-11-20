import Decimal from 'decimal.js';

/**
 * Calculate Simple Moving Average (SMA)
 */
export function sma(values: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }

  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function ema(values: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  let emaValue = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(emaValue);
    } else {
      emaValue = (values[i] - emaValue) * multiplier + emaValue;
      result.push(emaValue);
    }
  }

  return result;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[], period: number): number[] {
  const result: number[] = [];
  const means = sma(values, period);

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    const slice = values.slice(i - period + 1, i + 1);
    const mean = means[i];
    const squaredDiffs = slice.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    result.push(Math.sqrt(variance));
  }

  return result;
}

/**
 * Calculate True Range for ATR
 */
export function trueRange(high: number[], low: number[], close: number[]): number[] {
  const tr: number[] = [];

  for (let i = 0; i < high.length; i++) {
    if (i === 0) {
      tr.push(high[i] - low[i]);
    } else {
      const hl = high[i] - low[i];
      const hc = Math.abs(high[i] - close[i - 1]);
      const lc = Math.abs(low[i] - close[i - 1]);
      tr.push(Math.max(hl, hc, lc));
    }
  }

  return tr;
}

/**
 * Calculate rate of change
 */
export function rateOfChange(values: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else {
      const roc = ((values[i] - values[i - period]) / values[i - period]) * 100;
      result.push(roc);
    }
  }

  return result;
}

/**
 * Find local maxima (peaks)
 */
export function findPeaks(values: number[], order: number = 3): number[] {
  const peaks: number[] = [];

  for (let i = order; i < values.length - order; i++) {
    let isPeak = true;

    for (let j = 1; j <= order; j++) {
      if (values[i] <= values[i - j] || values[i] <= values[i + j]) {
        isPeak = false;
        break;
      }
    }

    if (isPeak) {
      peaks.push(i);
    }
  }

  return peaks;
}

/**
 * Find local minima (troughs)
 */
export function findTroughs(values: number[], order: number = 3): number[] {
  const troughs: number[] = [];

  for (let i = order; i < values.length - order; i++) {
    let isTrough = true;

    for (let j = 1; j <= order; j++) {
      if (values[i] >= values[i - j] || values[i] >= values[i + j]) {
        isTrough = false;
        break;
      }
    }

    if (isTrough) {
      troughs.push(i);
    }
  }

  return troughs;
}

/**
 * Calculate correlation coefficient between two series
 */
export function correlation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);

  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate linear regression
 */
export function linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = values.reduce((sum, yi) => sum + yi * yi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  const ssRes = values.reduce((sum, yi, i) => {
    const predicted = slope * i + intercept;
    return sum + Math.pow(yi - predicted, 2);
  }, 0);
  const ssTot = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const r2 = 1 - (ssRes / ssTot);

  return { slope, intercept, r2 };
}

/**
 * Normalize values to 0-100 range
 */
export function normalize(values: number[], min: number, max: number): number[] {
  return values.map(v => ((v - min) / (max - min)) * 100);
}

/**
 * Calculate percentage change
 */
export function percentageChange(current: number, previous: number): number {
  return ((current - previous) / previous) * 100;
}
