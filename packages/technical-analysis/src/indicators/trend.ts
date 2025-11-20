/**
 * Trend Indicators
 * Moving averages, MACD, ADX, etc.
 */

import { PriceData } from '@intelgraph/market-data';
import { IndicatorResult } from '../types';

export class TrendIndicators {
  /**
   * Simple Moving Average (SMA)
   */
  static sma(prices: PriceData[], period: number): IndicatorResult[] {
    const results: IndicatorResult[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j].close;
      }

      results.push({
        timestamp: prices[i].timestamp,
        value: sum / period,
      });
    }

    return results;
  }

  /**
   * Exponential Moving Average (EMA)
   */
  static ema(prices: PriceData[], period: number): IndicatorResult[] {
    const results: IndicatorResult[] = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA for first value
    let ema = 0;
    for (let i = 0; i < period; i++) {
      ema += prices[i].close;
    }
    ema = ema / period;

    results.push({
      timestamp: prices[period - 1].timestamp,
      value: ema,
    });

    // Calculate EMA for remaining values
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i].close - ema) * multiplier + ema;
      results.push({
        timestamp: prices[i].timestamp,
        value: ema,
      });
    }

    return results;
  }

  /**
   * Moving Average Convergence Divergence (MACD)
   */
  static macd(
    prices: PriceData[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): {
    macd: IndicatorResult[];
    signal: IndicatorResult[];
    histogram: IndicatorResult[];
  } {
    const fastEma = this.ema(prices, fastPeriod);
    const slowEma = this.ema(prices, slowPeriod);

    // Calculate MACD line
    const macdLine: IndicatorResult[] = [];
    const startIdx = slowPeriod - fastPeriod;

    for (let i = 0; i < slowEma.length; i++) {
      macdLine.push({
        timestamp: slowEma[i].timestamp,
        value: fastEma[i + startIdx].value - slowEma[i].value,
      });
    }

    // Calculate signal line (EMA of MACD)
    const signalLine = this.emaFromResults(macdLine, signalPeriod);

    // Calculate histogram
    const histogram: IndicatorResult[] = [];
    for (let i = 0; i < signalLine.length; i++) {
      histogram.push({
        timestamp: signalLine[i].timestamp,
        value: macdLine[i + (macdLine.length - signalLine.length)].value - signalLine[i].value,
      });
    }

    return {
      macd: macdLine,
      signal: signalLine,
      histogram,
    };
  }

  /**
   * Relative Strength Index (RSI)
   */
  static rsi(prices: PriceData[], period: number = 14): IndicatorResult[] {
    const results: IndicatorResult[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i].close - prices[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }

    // Calculate initial average gain/loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // Calculate RSI
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      results.push({
        timestamp: prices[i + 1].timestamp,
        value: rsi,
        metadata: { avgGain, avgLoss },
      });
    }

    return results;
  }

  /**
   * Bollinger Bands
   */
  static bollingerBands(
    prices: PriceData[],
    period: number = 20,
    stdDev: number = 2
  ): {
    upper: IndicatorResult[];
    middle: IndicatorResult[];
    lower: IndicatorResult[];
  } {
    const middle = this.sma(prices, period);
    const upper: IndicatorResult[] = [];
    const lower: IndicatorResult[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      // Calculate standard deviation
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = middle[i - period + 1].value;
      const variance = slice.reduce((sum, p) => sum + Math.pow(p.close - mean, 2), 0) / period;
      const std = Math.sqrt(variance);

      upper.push({
        timestamp: prices[i].timestamp,
        value: mean + stdDev * std,
      });

      lower.push({
        timestamp: prices[i].timestamp,
        value: mean - stdDev * std,
      });
    }

    return { upper, middle, lower };
  }

  /**
   * Average Directional Index (ADX)
   */
  static adx(prices: PriceData[], period: number = 14): IndicatorResult[] {
    const results: IndicatorResult[] = [];
    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    // Calculate TR, +DM, -DM
    for (let i = 1; i < prices.length; i++) {
      const high = prices[i].high;
      const low = prices[i].low;
      const prevHigh = prices[i - 1].high;
      const prevLow = prices[i - 1].low;
      const prevClose = prices[i - 1].close;

      tr.push(Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      ));

      const highDiff = high - prevHigh;
      const lowDiff = prevLow - low;

      plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
    }

    // Smooth TR, +DM, -DM
    let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

    const dx: number[] = [];

    for (let i = period; i < tr.length; i++) {
      smoothTR = smoothTR - smoothTR / period + tr[i];
      smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
      smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];

      const plusDI = (smoothPlusDM / smoothTR) * 100;
      const minusDI = (smoothMinusDM / smoothTR) * 100;

      const dxValue = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
      dx.push(dxValue);
    }

    // Calculate ADX (smoothed DX)
    let adx = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;

    results.push({
      timestamp: prices[period * 2 - 1].timestamp,
      value: adx,
    });

    for (let i = period; i < dx.length; i++) {
      adx = (adx * (period - 1) + dx[i]) / period;
      results.push({
        timestamp: prices[i + period].timestamp,
        value: adx,
      });
    }

    return results;
  }

  /**
   * Helper: Calculate EMA from indicator results
   */
  private static emaFromResults(data: IndicatorResult[], period: number): IndicatorResult[] {
    const results: IndicatorResult[] = [];
    const multiplier = 2 / (period + 1);

    let ema = data.slice(0, period).reduce((sum, d) => sum + d.value, 0) / period;
    results.push({
      timestamp: data[period - 1].timestamp,
      value: ema,
    });

    for (let i = period; i < data.length; i++) {
      ema = (data[i].value - ema) * multiplier + ema;
      results.push({
        timestamp: data[i].timestamp,
        value: ema,
      });
    }

    return results;
  }
}
