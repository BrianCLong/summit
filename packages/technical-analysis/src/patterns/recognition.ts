/**
 * Pattern Recognition
 * Detects chart patterns like head and shoulders, triangles, etc.
 */

import { PriceData } from '@intelgraph/market-data';
import { Pattern, PatternType, PatternPoint } from '../types';

export class PatternRecognition {
  /**
   * Find local peaks and troughs
   */
  private static findPivots(
    prices: PriceData[],
    window: number = 5
  ): Array<{ index: number; type: 'PEAK' | 'TROUGH'; price: number }> {
    const pivots: Array<{ index: number; type: 'PEAK' | 'TROUGH'; price: number }> = [];

    for (let i = window; i < prices.length - window; i++) {
      const slice = prices.slice(i - window, i + window + 1);
      const currentHigh = prices[i].high;
      const currentLow = prices[i].low;

      // Check for peak
      if (slice.every(p => p.high <= currentHigh)) {
        pivots.push({ index: i, type: 'PEAK', price: currentHigh });
      }

      // Check for trough
      if (slice.every(p => p.low >= currentLow)) {
        pivots.push({ index: i, type: 'TROUGH', price: currentLow });
      }
    }

    return pivots;
  }

  /**
   * Detect Head and Shoulders pattern
   */
  static detectHeadAndShoulders(
    symbol: string,
    prices: PriceData[],
    tolerance: number = 0.02
  ): Pattern[] {
    const patterns: Pattern[] = [];
    const pivots = this.findPivots(prices, 5).filter(p => p.type === 'PEAK');

    // Need at least 3 peaks for head and shoulders
    for (let i = 0; i < pivots.length - 2; i++) {
      const leftShoulder = pivots[i];
      const head = pivots[i + 1];
      const rightShoulder = pivots[i + 2];

      // Check if middle peak is highest (head)
      if (head.price > leftShoulder.price && head.price > rightShoulder.price) {
        // Check if shoulders are roughly equal
        const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price;

        if (shoulderDiff <= tolerance) {
          const confidence = 1 - shoulderDiff / tolerance;

          patterns.push({
            type: PatternType.HEAD_AND_SHOULDERS,
            symbol,
            startTime: prices[leftShoulder.index].timestamp,
            endTime: prices[rightShoulder.index].timestamp,
            confidence,
            direction: 'BEARISH',
            points: [
              {
                timestamp: prices[leftShoulder.index].timestamp,
                price: leftShoulder.price,
                role: 'left_shoulder',
              },
              {
                timestamp: prices[head.index].timestamp,
                price: head.price,
                role: 'head',
              },
              {
                timestamp: prices[rightShoulder.index].timestamp,
                price: rightShoulder.price,
                role: 'right_shoulder',
              },
            ],
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect Double Top pattern
   */
  static detectDoubleTop(
    symbol: string,
    prices: PriceData[],
    tolerance: number = 0.02
  ): Pattern[] {
    const patterns: Pattern[] = [];
    const pivots = this.findPivots(prices, 5).filter(p => p.type === 'PEAK');

    for (let i = 0; i < pivots.length - 1; i++) {
      const firstTop = pivots[i];
      const secondTop = pivots[i + 1];

      // Check if tops are roughly equal
      const priceDiff = Math.abs(firstTop.price - secondTop.price) / firstTop.price;

      if (priceDiff <= tolerance) {
        // Find the trough between tops
        const betweenPivots = this.findPivots(
          prices.slice(firstTop.index, secondTop.index + 1),
          3
        ).filter(p => p.type === 'TROUGH');

        if (betweenPivots.length > 0) {
          const trough = betweenPivots[0];
          const confidence = 1 - priceDiff / tolerance;

          patterns.push({
            type: PatternType.DOUBLE_TOP,
            symbol,
            startTime: prices[firstTop.index].timestamp,
            endTime: prices[secondTop.index].timestamp,
            confidence,
            direction: 'BEARISH',
            points: [
              {
                timestamp: prices[firstTop.index].timestamp,
                price: firstTop.price,
                role: 'first_top',
              },
              {
                timestamp: prices[firstTop.index + trough.index].timestamp,
                price: trough.price,
                role: 'trough',
              },
              {
                timestamp: prices[secondTop.index].timestamp,
                price: secondTop.price,
                role: 'second_top',
              },
            ],
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect Double Bottom pattern
   */
  static detectDoubleBottom(
    symbol: string,
    prices: PriceData[],
    tolerance: number = 0.02
  ): Pattern[] {
    const patterns: Pattern[] = [];
    const pivots = this.findPivots(prices, 5).filter(p => p.type === 'TROUGH');

    for (let i = 0; i < pivots.length - 1; i++) {
      const firstBottom = pivots[i];
      const secondBottom = pivots[i + 1];

      const priceDiff = Math.abs(firstBottom.price - secondBottom.price) / firstBottom.price;

      if (priceDiff <= tolerance) {
        const betweenPivots = this.findPivots(
          prices.slice(firstBottom.index, secondBottom.index + 1),
          3
        ).filter(p => p.type === 'PEAK');

        if (betweenPivots.length > 0) {
          const peak = betweenPivots[0];
          const confidence = 1 - priceDiff / tolerance;

          patterns.push({
            type: PatternType.DOUBLE_BOTTOM,
            symbol,
            startTime: prices[firstBottom.index].timestamp,
            endTime: prices[secondBottom.index].timestamp,
            confidence,
            direction: 'BULLISH',
            points: [
              {
                timestamp: prices[firstBottom.index].timestamp,
                price: firstBottom.price,
                role: 'first_bottom',
              },
              {
                timestamp: prices[firstBottom.index + peak.index].timestamp,
                price: peak.price,
                role: 'peak',
              },
              {
                timestamp: prices[secondBottom.index].timestamp,
                price: secondBottom.price,
                role: 'second_bottom',
              },
            ],
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect Triangle patterns (Ascending, Descending, Symmetrical)
   */
  static detectTriangles(
    symbol: string,
    prices: PriceData[],
    minPoints: number = 4
  ): Pattern[] {
    const patterns: Pattern[] = [];
    const pivots = this.findPivots(prices, 5);

    // Need alternating peaks and troughs
    const peaks = pivots.filter(p => p.type === 'PEAK');
    const troughs = pivots.filter(p => p.type === 'TROUGH');

    if (peaks.length >= 2 && troughs.length >= 2) {
      // Calculate trend lines
      const peakSlope = this.calculateSlope(peaks);
      const troughSlope = this.calculateSlope(troughs);

      // Ascending triangle: flat top, rising bottom
      if (Math.abs(peakSlope) < 0.001 && troughSlope > 0.001) {
        patterns.push({
          type: PatternType.ASCENDING_TRIANGLE,
          symbol,
          startTime: prices[Math.min(peaks[0].index, troughs[0].index)].timestamp,
          endTime: prices[Math.max(peaks[peaks.length - 1].index, troughs[troughs.length - 1].index)].timestamp,
          confidence: 0.7,
          direction: 'BULLISH',
          points: [...peaks, ...troughs]
            .sort((a, b) => a.index - b.index)
            .map(p => ({
              timestamp: prices[p.index].timestamp,
              price: p.price,
              role: p.type.toLowerCase(),
            })),
        });
      }

      // Descending triangle: falling top, flat bottom
      if (peakSlope < -0.001 && Math.abs(troughSlope) < 0.001) {
        patterns.push({
          type: PatternType.DESCENDING_TRIANGLE,
          symbol,
          startTime: prices[Math.min(peaks[0].index, troughs[0].index)].timestamp,
          endTime: prices[Math.max(peaks[peaks.length - 1].index, troughs[troughs.length - 1].index)].timestamp,
          confidence: 0.7,
          direction: 'BEARISH',
          points: [...peaks, ...troughs]
            .sort((a, b) => a.index - b.index)
            .map(p => ({
              timestamp: prices[p.index].timestamp,
              price: p.price,
              role: p.type.toLowerCase(),
            })),
        });
      }

      // Symmetrical triangle: converging trend lines
      if (peakSlope < -0.001 && troughSlope > 0.001) {
        patterns.push({
          type: PatternType.SYMMETRICAL_TRIANGLE,
          symbol,
          startTime: prices[Math.min(peaks[0].index, troughs[0].index)].timestamp,
          endTime: prices[Math.max(peaks[peaks.length - 1].index, troughs[troughs.length - 1].index)].timestamp,
          confidence: 0.7,
          direction: 'NEUTRAL',
          points: [...peaks, ...troughs]
            .sort((a, b) => a.index - b.index)
            .map(p => ({
              timestamp: prices[p.index].timestamp,
              price: p.price,
              role: p.type.toLowerCase(),
            })),
        });
      }
    }

    return patterns;
  }

  /**
   * Calculate slope of a trend line through pivots
   */
  private static calculateSlope(pivots: Array<{ index: number; price: number }>): number {
    if (pivots.length < 2) return 0;

    const n = pivots.length;
    const sumX = pivots.reduce((sum, p) => sum + p.index, 0);
    const sumY = pivots.reduce((sum, p) => sum + p.price, 0);
    const sumXY = pivots.reduce((sum, p) => sum + p.index * p.price, 0);
    const sumX2 = pivots.reduce((sum, p) => sum + p.index * p.index, 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * Detect all patterns
   */
  static detectAllPatterns(symbol: string, prices: PriceData[]): Pattern[] {
    const patterns: Pattern[] = [];

    patterns.push(...this.detectHeadAndShoulders(symbol, prices));
    patterns.push(...this.detectDoubleTop(symbol, prices));
    patterns.push(...this.detectDoubleBottom(symbol, prices));
    patterns.push(...this.detectTriangles(symbol, prices));

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }
}
