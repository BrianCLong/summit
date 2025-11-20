/**
 * Volume Indicators
 * OBV, CMF, VWAP, Volume Profile, etc.
 */

import { PriceData } from '@intelgraph/market-data';
import { IndicatorResult } from '../types';

export class VolumeIndicators {
  /**
   * On-Balance Volume (OBV)
   */
  static obv(prices: PriceData[]): IndicatorResult[] {
    const results: IndicatorResult[] = [];
    let obv = 0;

    for (let i = 1; i < prices.length; i++) {
      if (prices[i].close > prices[i - 1].close) {
        obv += prices[i].volume;
      } else if (prices[i].close < prices[i - 1].close) {
        obv -= prices[i].volume;
      }

      results.push({
        timestamp: prices[i].timestamp,
        value: obv,
      });
    }

    return results;
  }

  /**
   * Chaikin Money Flow (CMF)
   */
  static cmf(prices: PriceData[], period: number = 20): IndicatorResult[] {
    const results: IndicatorResult[] = [];
    const mfv: number[] = []; // Money Flow Volume

    // Calculate Money Flow Multiplier and Volume
    for (const price of prices) {
      const mfMultiplier = ((price.close - price.low) - (price.high - price.close)) /
                          (price.high - price.low || 1);
      mfv.push(mfMultiplier * price.volume);
    }

    // Calculate CMF
    for (let i = period - 1; i < prices.length; i++) {
      const sumMFV = mfv.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      const sumVolume = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b.volume, 0);

      results.push({
        timestamp: prices[i].timestamp,
        value: sumMFV / sumVolume,
      });
    }

    return results;
  }

  /**
   * Volume Weighted Average Price (VWAP)
   */
  static vwap(prices: PriceData[]): IndicatorResult[] {
    const results: IndicatorResult[] = [];
    let cumulativeTPV = 0; // Typical Price * Volume
    let cumulativeVolume = 0;

    for (const price of prices) {
      const typicalPrice = (price.high + price.low + price.close) / 3;
      cumulativeTPV += typicalPrice * price.volume;
      cumulativeVolume += price.volume;

      results.push({
        timestamp: price.timestamp,
        value: cumulativeTPV / cumulativeVolume,
      });
    }

    return results;
  }

  /**
   * Accumulation/Distribution Line
   */
  static accumulationDistribution(prices: PriceData[]): IndicatorResult[] {
    const results: IndicatorResult[] = [];
    let ad = 0;

    for (const price of prices) {
      const mfMultiplier = ((price.close - price.low) - (price.high - price.close)) /
                          (price.high - price.low || 1);
      const mfVolume = mfMultiplier * price.volume;
      ad += mfVolume;

      results.push({
        timestamp: price.timestamp,
        value: ad,
      });
    }

    return results;
  }

  /**
   * Money Flow Index (MFI)
   */
  static mfi(prices: PriceData[], period: number = 14): IndicatorResult[] {
    const results: IndicatorResult[] = [];
    const positiveFlow: number[] = [];
    const negativeFlow: number[] = [];

    // Calculate typical price and money flow
    for (let i = 1; i < prices.length; i++) {
      const typicalPrice = (prices[i].high + prices[i].low + prices[i].close) / 3;
      const prevTypicalPrice = (prices[i - 1].high + prices[i - 1].low + prices[i - 1].close) / 3;
      const rawMoneyFlow = typicalPrice * prices[i].volume;

      if (typicalPrice > prevTypicalPrice) {
        positiveFlow.push(rawMoneyFlow);
        negativeFlow.push(0);
      } else {
        positiveFlow.push(0);
        negativeFlow.push(rawMoneyFlow);
      }
    }

    // Calculate MFI
    for (let i = period - 1; i < positiveFlow.length; i++) {
      const posFlow = positiveFlow.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      const negFlow = negativeFlow.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);

      const mfRatio = posFlow / (negFlow || 1);
      const mfi = 100 - (100 / (1 + mfRatio));

      results.push({
        timestamp: prices[i + 1].timestamp,
        value: mfi,
      });
    }

    return results;
  }

  /**
   * Volume Profile
   * Returns volume distribution across price levels
   */
  static volumeProfile(
    prices: PriceData[],
    numBins: number = 50
  ): Array<{ price: number; volume: number }> {
    // Find price range
    const minPrice = Math.min(...prices.map(p => p.low));
    const maxPrice = Math.max(...prices.map(p => p.high));
    const priceStep = (maxPrice - minPrice) / numBins;

    // Initialize bins
    const bins: Array<{ price: number; volume: number }> = [];
    for (let i = 0; i < numBins; i++) {
      bins.push({
        price: minPrice + (i + 0.5) * priceStep,
        volume: 0,
      });
    }

    // Distribute volume across bins
    for (const price of prices) {
      const avgPrice = (price.high + price.low) / 2;
      const binIndex = Math.min(
        Math.floor((avgPrice - minPrice) / priceStep),
        numBins - 1
      );
      bins[binIndex].volume += price.volume;
    }

    return bins.sort((a, b) => b.volume - a.volume);
  }

  /**
   * Volume Trend
   * Analyzes volume trend (increasing/decreasing)
   */
  static volumeTrend(prices: PriceData[], period: number = 20): IndicatorResult[] {
    const results: IndicatorResult[] = [];

    for (let i = period; i < prices.length; i++) {
      const recentVolumes = prices.slice(i - period, i).map(p => p.volume);
      const olderVolumes = prices.slice(i - period * 2, i - period).map(p => p.volume);

      const recentAvg = recentVolumes.reduce((a, b) => a + b, 0) / period;
      const olderAvg = olderVolumes.reduce((a, b) => a + b, 0) / period;

      const trend = (recentAvg - olderAvg) / olderAvg;

      results.push({
        timestamp: prices[i].timestamp,
        value: trend,
        metadata: {
          recentAvg,
          olderAvg,
        },
      });
    }

    return results;
  }

  /**
   * Volume Spike Detection
   * Detects abnormal volume spikes
   */
  static volumeSpikes(
    prices: PriceData[],
    period: number = 20,
    threshold: number = 2.0
  ): Array<{ timestamp: Date; volume: number; avgVolume: number; factor: number }> {
    const spikes: Array<{ timestamp: Date; volume: number; avgVolume: number; factor: number }> = [];

    for (let i = period; i < prices.length; i++) {
      const recentVolumes = prices.slice(i - period, i).map(p => p.volume);
      const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / period;
      const currentVolume = prices[i].volume;
      const factor = currentVolume / avgVolume;

      if (factor >= threshold) {
        spikes.push({
          timestamp: prices[i].timestamp,
          volume: currentVolume,
          avgVolume,
          factor,
        });
      }
    }

    return spikes;
  }
}
