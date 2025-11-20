/**
 * Chart Pattern Recognition
 * Common chart patterns used in technical analysis
 */

import { findPeaks, findTroughs, linearRegression } from '../utils';

export interface ChartPattern {
  startIndex: number;
  endIndex: number;
  pattern: string;
  bullish: boolean;
  confidence: number;
  breakoutPrice?: number;
  target?: number;
}

/**
 * Detect support and resistance levels
 */
export interface SupportResistance {
  price: number;
  type: 'support' | 'resistance';
  strength: number; // Number of touches
  lastTouch: number; // Index of last touch
}

export function detectSupportResistance(
  high: number[],
  low: number[],
  close: number[],
  threshold: number = 0.02 // 2% price tolerance
): SupportResistance[] {
  const levels: Map<number, SupportResistance> = new Map();

  // Find peaks for resistance
  const peaks = findPeaks(high, 3);
  for (const peakIdx of peaks) {
    const price = high[peakIdx];
    let found = false;

    for (const [levelPrice, level] of levels) {
      if (Math.abs(price - levelPrice) / levelPrice < threshold) {
        level.strength++;
        level.lastTouch = Math.max(level.lastTouch, peakIdx);
        found = true;
        break;
      }
    }

    if (!found) {
      levels.set(price, {
        price,
        type: 'resistance',
        strength: 1,
        lastTouch: peakIdx,
      });
    }
  }

  // Find troughs for support
  const troughs = findTroughs(low, 3);
  for (const troughIdx of troughs) {
    const price = low[troughIdx];
    let found = false;

    for (const [levelPrice, level] of levels) {
      if (Math.abs(price - levelPrice) / levelPrice < threshold) {
        level.strength++;
        level.lastTouch = Math.max(level.lastTouch, troughIdx);
        found = true;
        break;
      }
    }

    if (!found) {
      levels.set(price, {
        price,
        type: 'support',
        strength: 1,
        lastTouch: troughIdx,
      });
    }
  }

  return Array.from(levels.values())
    .filter(level => level.strength >= 2)
    .sort((a, b) => b.strength - a.strength);
}

/**
 * Detect Head and Shoulders pattern
 */
export function detectHeadAndShoulders(
  high: number[],
  low: number[],
  close: number[],
  minPatternBars: number = 20
): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  const peaks = findPeaks(high, 5);

  for (let i = 0; i < peaks.length - 2; i++) {
    const leftShoulder = peaks[i];
    const head = peaks[i + 1];
    const rightShoulder = peaks[i + 2];

    // Check if head is higher than shoulders
    if (high[head] > high[leftShoulder] && high[head] > high[rightShoulder]) {
      // Shoulders should be roughly equal
      const shoulderDiff = Math.abs(high[leftShoulder] - high[rightShoulder]) / high[leftShoulder];

      if (shoulderDiff < 0.05) { // 5% tolerance
        // Find neckline
        const troughsBetween = findTroughs(low, 3)
          .filter(t => t > leftShoulder && t < rightShoulder);

        if (troughsBetween.length >= 2) {
          const necklinePrice = Math.max(low[troughsBetween[0]], low[troughsBetween[1]]);

          patterns.push({
            startIndex: leftShoulder,
            endIndex: rightShoulder,
            pattern: 'Head and Shoulders',
            bullish: false,
            confidence: 80,
            breakoutPrice: necklinePrice,
            target: necklinePrice - (high[head] - necklinePrice),
          });
        }
      }
    }
  }

  return patterns;
}

/**
 * Detect Inverse Head and Shoulders pattern
 */
export function detectInverseHeadAndShoulders(
  high: number[],
  low: number[],
  close: number[],
  minPatternBars: number = 20
): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  const troughs = findTroughs(low, 5);

  for (let i = 0; i < troughs.length - 2; i++) {
    const leftShoulder = troughs[i];
    const head = troughs[i + 1];
    const rightShoulder = troughs[i + 2];

    // Check if head is lower than shoulders
    if (low[head] < low[leftShoulder] && low[head] < low[rightShoulder]) {
      // Shoulders should be roughly equal
      const shoulderDiff = Math.abs(low[leftShoulder] - low[rightShoulder]) / low[leftShoulder];

      if (shoulderDiff < 0.05) {
        // Find neckline
        const peaksBetween = findPeaks(high, 3)
          .filter(p => p > leftShoulder && p < rightShoulder);

        if (peaksBetween.length >= 2) {
          const necklinePrice = Math.min(high[peaksBetween[0]], high[peaksBetween[1]]);

          patterns.push({
            startIndex: leftShoulder,
            endIndex: rightShoulder,
            pattern: 'Inverse Head and Shoulders',
            bullish: true,
            confidence: 80,
            breakoutPrice: necklinePrice,
            target: necklinePrice + (necklinePrice - low[head]),
          });
        }
      }
    }
  }

  return patterns;
}

/**
 * Detect Double Top pattern
 */
export function detectDoubleTop(
  high: number[],
  low: number[],
  close: number[],
  tolerance: number = 0.03
): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  const peaks = findPeaks(high, 5);

  for (let i = 0; i < peaks.length - 1; i++) {
    const firstPeak = peaks[i];
    const secondPeak = peaks[i + 1];

    // Peaks should be roughly equal
    const priceDiff = Math.abs(high[firstPeak] - high[secondPeak]) / high[firstPeak];

    if (priceDiff < tolerance) {
      // Find trough between peaks
      const troughsBetween = findTroughs(low, 3)
        .filter(t => t > firstPeak && t < secondPeak);

      if (troughsBetween.length > 0) {
        const necklinePrice = Math.min(...troughsBetween.map(t => low[t]));

        patterns.push({
          startIndex: firstPeak,
          endIndex: secondPeak,
          pattern: 'Double Top',
          bullish: false,
          confidence: 75,
          breakoutPrice: necklinePrice,
          target: necklinePrice - (high[firstPeak] - necklinePrice),
        });
      }
    }
  }

  return patterns;
}

/**
 * Detect Double Bottom pattern
 */
export function detectDoubleBottom(
  high: number[],
  low: number[],
  close: number[],
  tolerance: number = 0.03
): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  const troughs = findTroughs(low, 5);

  for (let i = 0; i < troughs.length - 1; i++) {
    const firstTrough = troughs[i];
    const secondTrough = troughs[i + 1];

    // Troughs should be roughly equal
    const priceDiff = Math.abs(low[firstTrough] - low[secondTrough]) / low[firstTrough];

    if (priceDiff < tolerance) {
      // Find peak between troughs
      const peaksBetween = findPeaks(high, 3)
        .filter(p => p > firstTrough && p < secondTrough);

      if (peaksBetween.length > 0) {
        const necklinePrice = Math.max(...peaksBetween.map(p => high[p]));

        patterns.push({
          startIndex: firstTrough,
          endIndex: secondTrough,
          pattern: 'Double Bottom',
          bullish: true,
          confidence: 75,
          breakoutPrice: necklinePrice,
          target: necklinePrice + (necklinePrice - low[firstTrough]),
        });
      }
    }
  }

  return patterns;
}

/**
 * Detect Triangle patterns
 */
export function detectTriangle(
  high: number[],
  low: number[],
  close: number[],
  minBars: number = 15
): ChartPattern[] {
  const patterns: ChartPattern[] = [];

  for (let i = minBars; i < close.length; i++) {
    const slice = close.slice(i - minBars, i);
    const highSlice = high.slice(i - minBars, i);
    const lowSlice = low.slice(i - minBars, i);

    const highRegression = linearRegression(highSlice);
    const lowRegression = linearRegression(lowSlice);

    // Ascending Triangle: flat resistance, rising support
    if (Math.abs(highRegression.slope) < 0.1 && lowRegression.slope > 0.1) {
      patterns.push({
        startIndex: i - minBars,
        endIndex: i,
        pattern: 'Ascending Triangle',
        bullish: true,
        confidence: 70,
      });
    }

    // Descending Triangle: declining resistance, flat support
    if (highRegression.slope < -0.1 && Math.abs(lowRegression.slope) < 0.1) {
      patterns.push({
        startIndex: i - minBars,
        endIndex: i,
        pattern: 'Descending Triangle',
        bullish: false,
        confidence: 70,
      });
    }

    // Symmetrical Triangle: converging lines
    if (highRegression.slope < -0.05 && lowRegression.slope > 0.05) {
      patterns.push({
        startIndex: i - minBars,
        endIndex: i,
        pattern: 'Symmetrical Triangle',
        bullish: false, // Neutral until breakout
        confidence: 65,
      });
    }
  }

  return patterns;
}

/**
 * Detect all chart patterns
 */
export function detectAllChartPatterns(
  high: number[],
  low: number[],
  close: number[]
): ChartPattern[] {
  const allPatterns: ChartPattern[] = [];

  allPatterns.push(...detectHeadAndShoulders(high, low, close));
  allPatterns.push(...detectInverseHeadAndShoulders(high, low, close));
  allPatterns.push(...detectDoubleTop(high, low, close));
  allPatterns.push(...detectDoubleBottom(high, low, close));
  allPatterns.push(...detectTriangle(high, low, close));

  return allPatterns.sort((a, b) => a.endIndex - b.endIndex);
}
