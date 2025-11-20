/**
 * Support and Resistance Detection
 * Identifies key price levels
 */

import { PriceData } from '@intelgraph/market-data';
import { SupportResistance, PriceLevel } from '../types';

export class SupportResistanceDetector {
  /**
   * Detect support and resistance levels
   */
  static detect(
    symbol: string,
    prices: PriceData[],
    tolerance: number = 0.01,
    minTouches: number = 2
  ): SupportResistance {
    const levels = this.findPriceLevels(prices, tolerance);
    const filteredLevels = levels.filter(l => l.touches >= minTouches);

    // Separate into support and resistance
    const currentPrice = prices[prices.length - 1].close;
    const supports = filteredLevels
      .filter(l => l.price < currentPrice)
      .sort((a, b) => b.price - a.price);
    const resistances = filteredLevels
      .filter(l => l.price > currentPrice)
      .sort((a, b) => a.price - b.price);

    return {
      symbol,
      timestamp: prices[prices.length - 1].timestamp,
      supports,
      resistances,
    };
  }

  /**
   * Find price levels where price has bounced multiple times
   */
  private static findPriceLevels(
    prices: PriceData[],
    tolerance: number
  ): PriceLevel[] {
    const levelMap = new Map<number, PriceLevel>();

    // Analyze each price point
    for (let i = 1; i < prices.length - 1; i++) {
      const price = prices[i];
      const prevPrice = prices[i - 1];
      const nextPrice = prices[i + 1];

      // Check for support bounce (low followed by higher close)
      if (
        price.low < prevPrice.low &&
        price.low < nextPrice.low &&
        price.close > price.open
      ) {
        this.addOrUpdateLevel(levelMap, price.low, price.timestamp, tolerance);
      }

      // Check for resistance rejection (high followed by lower close)
      if (
        price.high > prevPrice.high &&
        price.high > nextPrice.high &&
        price.close < price.open
      ) {
        this.addOrUpdateLevel(levelMap, price.high, price.timestamp, tolerance);
      }
    }

    // Calculate strength based on touches and recency
    const levels = Array.from(levelMap.values());
    const maxTouches = Math.max(...levels.map(l => l.touches));

    for (const level of levels) {
      const ageInDays = (Date.now() - level.lastTouch.getTime()) / (1000 * 60 * 60 * 24);
      const recencyFactor = Math.max(0, 1 - ageInDays / 365); // Decay over a year
      const touchFactor = level.touches / maxTouches;
      level.strength = (touchFactor * 0.7 + recencyFactor * 0.3);
    }

    return levels.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Add or update a price level
   */
  private static addOrUpdateLevel(
    levelMap: Map<number, PriceLevel>,
    price: number,
    timestamp: Date,
    tolerance: number
  ): void {
    // Find existing level within tolerance
    let foundLevel: PriceLevel | null = null;
    let foundKey: number | null = null;

    for (const [key, level] of levelMap.entries()) {
      if (Math.abs(key - price) / key <= tolerance) {
        foundLevel = level;
        foundKey = key;
        break;
      }
    }

    if (foundLevel && foundKey !== null) {
      // Update existing level
      foundLevel.touches++;
      foundLevel.lastTouch = timestamp;
      // Update price to weighted average
      foundLevel.price = (foundLevel.price * (foundLevel.touches - 1) + price) / foundLevel.touches;
    } else {
      // Create new level
      levelMap.set(price, {
        price,
        strength: 0,
        touches: 1,
        lastTouch: timestamp,
      });
    }
  }

  /**
   * Detect breakouts (price breaking through support/resistance)
   */
  static detectBreakouts(
    prices: PriceData[],
    supportResistance: SupportResistance,
    volumeThreshold: number = 1.5
  ): Array<{
    timestamp: Date;
    price: number;
    level: PriceLevel;
    type: 'SUPPORT_BREAK' | 'RESISTANCE_BREAK';
    volume: number;
    avgVolume: number;
  }> {
    const breakouts: Array<{
      timestamp: Date;
      price: number;
      level: PriceLevel;
      type: 'SUPPORT_BREAK' | 'RESISTANCE_BREAK';
      volume: number;
      avgVolume: number;
    }> = [];

    // Calculate average volume
    const avgVolume = prices.reduce((sum, p) => sum + p.volume, 0) / prices.length;

    for (let i = 1; i < prices.length; i++) {
      const price = prices[i];
      const prevPrice = prices[i - 1];

      // Check resistance breakouts
      for (const resistance of supportResistance.resistances) {
        if (
          prevPrice.close <= resistance.price &&
          price.close > resistance.price &&
          price.volume >= avgVolume * volumeThreshold
        ) {
          breakouts.push({
            timestamp: price.timestamp,
            price: price.close,
            level: resistance,
            type: 'RESISTANCE_BREAK',
            volume: price.volume,
            avgVolume,
          });
        }
      }

      // Check support breakdowns
      for (const support of supportResistance.supports) {
        if (
          prevPrice.close >= support.price &&
          price.close < support.price &&
          price.volume >= avgVolume * volumeThreshold
        ) {
          breakouts.push({
            timestamp: price.timestamp,
            price: price.close,
            level: support,
            type: 'SUPPORT_BREAK',
            volume: price.volume,
            avgVolume,
          });
        }
      }
    }

    return breakouts;
  }
}
