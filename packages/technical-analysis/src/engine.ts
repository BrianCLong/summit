/**
 * Technical Analysis Engine
 * Main orchestration engine for all technical analysis
 */

import { PriceData } from '@intelgraph/market-data';
import { TrendIndicators } from './indicators/trend';
import { VolumeIndicators } from './indicators/volume';
import { PatternRecognition } from './patterns/recognition';
import { SupportResistanceDetector } from './patterns/support-resistance';
import {
  IndicatorSeries,
  Pattern,
  SupportResistance,
  TrendAnalysis,
} from './types';

export interface AnalysisConfig {
  indicators?: {
    sma?: number[];
    ema?: number[];
    macd?: boolean;
    rsi?: boolean;
    bollinger?: boolean;
    adx?: boolean;
    obv?: boolean;
    cmf?: boolean;
    vwap?: boolean;
  };
  patterns?: {
    headAndShoulders?: boolean;
    doubleTop?: boolean;
    doubleBottom?: boolean;
    triangles?: boolean;
  };
  supportResistance?: boolean;
  trendAnalysis?: boolean;
}

export interface AnalysisResult {
  symbol: string;
  timestamp: Date;
  indicators: Record<string, IndicatorSeries>;
  patterns: Pattern[];
  supportResistance?: SupportResistance;
  trendAnalysis?: TrendAnalysis;
}

export class TechnicalAnalysisEngine {
  private config: AnalysisConfig;

  constructor(config: AnalysisConfig = {}) {
    this.config = {
      indicators: {
        sma: [20, 50, 200],
        ema: [12, 26],
        macd: true,
        rsi: true,
        bollinger: true,
        adx: true,
        obv: true,
        cmf: true,
        vwap: true,
        ...config.indicators,
      },
      patterns: {
        headAndShoulders: true,
        doubleTop: true,
        doubleBottom: true,
        triangles: true,
        ...config.patterns,
      },
      supportResistance: config.supportResistance !== false,
      trendAnalysis: config.trendAnalysis !== false,
    };
  }

  /**
   * Run complete technical analysis
   */
  async analyze(symbol: string, prices: PriceData[]): Promise<AnalysisResult> {
    const result: AnalysisResult = {
      symbol,
      timestamp: new Date(),
      indicators: {},
      patterns: [],
    };

    // Calculate indicators
    if (this.config.indicators) {
      result.indicators = this.calculateIndicators(symbol, prices);
    }

    // Detect patterns
    if (this.config.patterns) {
      result.patterns = this.detectPatterns(symbol, prices);
    }

    // Find support/resistance
    if (this.config.supportResistance) {
      result.supportResistance = SupportResistanceDetector.detect(symbol, prices);
    }

    // Analyze trend
    if (this.config.trendAnalysis) {
      result.trendAnalysis = this.analyzeTrend(symbol, prices);
    }

    return result;
  }

  /**
   * Calculate all configured indicators
   */
  private calculateIndicators(
    symbol: string,
    prices: PriceData[]
  ): Record<string, IndicatorSeries> {
    const indicators: Record<string, IndicatorSeries> = {};

    // SMA
    if (this.config.indicators!.sma) {
      for (const period of this.config.indicators!.sma) {
        indicators[`sma_${period}`] = {
          indicator: `SMA(${period})`,
          symbol,
          data: TrendIndicators.sma(prices, period),
        };
      }
    }

    // EMA
    if (this.config.indicators!.ema) {
      for (const period of this.config.indicators!.ema) {
        indicators[`ema_${period}`] = {
          indicator: `EMA(${period})`,
          symbol,
          data: TrendIndicators.ema(prices, period),
        };
      }
    }

    // MACD
    if (this.config.indicators!.macd) {
      const macd = TrendIndicators.macd(prices);
      indicators.macd = {
        indicator: 'MACD',
        symbol,
        data: macd.macd,
      };
      indicators.macd_signal = {
        indicator: 'MACD Signal',
        symbol,
        data: macd.signal,
      };
      indicators.macd_histogram = {
        indicator: 'MACD Histogram',
        symbol,
        data: macd.histogram,
      };
    }

    // RSI
    if (this.config.indicators!.rsi) {
      indicators.rsi = {
        indicator: 'RSI(14)',
        symbol,
        data: TrendIndicators.rsi(prices),
      };
    }

    // Bollinger Bands
    if (this.config.indicators!.bollinger) {
      const bb = TrendIndicators.bollingerBands(prices);
      indicators.bb_upper = {
        indicator: 'BB Upper',
        symbol,
        data: bb.upper,
      };
      indicators.bb_middle = {
        indicator: 'BB Middle',
        symbol,
        data: bb.middle,
      };
      indicators.bb_lower = {
        indicator: 'BB Lower',
        symbol,
        data: bb.lower,
      };
    }

    // ADX
    if (this.config.indicators!.adx) {
      indicators.adx = {
        indicator: 'ADX(14)',
        symbol,
        data: TrendIndicators.adx(prices),
      };
    }

    // OBV
    if (this.config.indicators!.obv) {
      indicators.obv = {
        indicator: 'OBV',
        symbol,
        data: VolumeIndicators.obv(prices),
      };
    }

    // CMF
    if (this.config.indicators!.cmf) {
      indicators.cmf = {
        indicator: 'CMF(20)',
        symbol,
        data: VolumeIndicators.cmf(prices),
      };
    }

    // VWAP
    if (this.config.indicators!.vwap) {
      indicators.vwap = {
        indicator: 'VWAP',
        symbol,
        data: VolumeIndicators.vwap(prices),
      };
    }

    return indicators;
  }

  /**
   * Detect all configured patterns
   */
  private detectPatterns(symbol: string, prices: PriceData[]): Pattern[] {
    const patterns: Pattern[] = [];

    if (this.config.patterns!.headAndShoulders) {
      patterns.push(...PatternRecognition.detectHeadAndShoulders(symbol, prices));
    }

    if (this.config.patterns!.doubleTop) {
      patterns.push(...PatternRecognition.detectDoubleTop(symbol, prices));
    }

    if (this.config.patterns!.doubleBottom) {
      patterns.push(...PatternRecognition.detectDoubleBottom(symbol, prices));
    }

    if (this.config.patterns!.triangles) {
      patterns.push(...PatternRecognition.detectTriangles(symbol, prices));
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze price trend
   */
  private analyzeTrend(symbol: string, prices: PriceData[]): TrendAnalysis {
    const recentPrices = prices.slice(-50); // Last 50 periods
    const sma20 = TrendIndicators.sma(recentPrices, 20);
    const sma50 = TrendIndicators.sma(recentPrices, 50);

    const currentPrice = recentPrices[recentPrices.length - 1].close;
    const sma20Current = sma20[sma20.length - 1].value;
    const sma50Current = sma50[sma50.length - 1]?.value || sma20Current;

    // Determine trend
    let trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
    let strength: number;

    if (currentPrice > sma20Current && sma20Current > sma50Current) {
      trend = 'UPTREND';
      strength = Math.min(1, (currentPrice - sma50Current) / sma50Current / 0.1);
    } else if (currentPrice < sma20Current && sma20Current < sma50Current) {
      trend = 'DOWNTREND';
      strength = Math.min(1, (sma50Current - currentPrice) / sma50Current / 0.1);
    } else {
      trend = 'SIDEWAYS';
      strength = 0.5;
    }

    // Calculate trend angle
    const firstPrice = recentPrices[0].close;
    const priceChange = currentPrice - firstPrice;
    const angle = Math.atan(priceChange / recentPrices.length) * (180 / Math.PI);

    return {
      symbol,
      timestamp: recentPrices[recentPrices.length - 1].timestamp,
      trend,
      strength,
      duration: recentPrices.length,
      angle,
    };
  }
}
