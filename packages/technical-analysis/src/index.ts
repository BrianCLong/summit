/**
 * @intelgraph/technical-analysis
 *
 * Comprehensive technical analysis library with 100+ indicators,
 * chart patterns, candlestick patterns, and trading signals.
 */

// Export all indicators
export * from './indicators/trend';
export * from './indicators/momentum';
export * from './indicators/volatility';
export * from './indicators/volume';

// Export pattern recognition
export * from './patterns/candlestick';
export * from './patterns/chart';

// Export utilities
export * from './utils';

/**
 * Convenience function to calculate all major indicators at once
 */
import { OHLCV } from '@intelgraph/market-data';
import { MACD, ADX } from './indicators/trend';
import { RSI, Stochastic } from './indicators/momentum';
import { BollingerBands, ATR } from './indicators/volatility';
import { OBV, VWAP } from './indicators/volume';

export interface TechnicalIndicators {
  macd: ReturnType<typeof MACD>;
  rsi: number[];
  stochastic: ReturnType<typeof Stochastic>;
  bollingerBands: ReturnType<typeof BollingerBands>;
  atr: number[];
  adx: ReturnType<typeof ADX>;
  obv: number[];
  vwap: number[];
}

export function calculateAllIndicators(ohlcv: OHLCV[]): TechnicalIndicators {
  const open = ohlcv.map(bar => bar.open);
  const high = ohlcv.map(bar => bar.high);
  const low = ohlcv.map(bar => bar.low);
  const close = ohlcv.map(bar => bar.close);
  const volume = ohlcv.map(bar => bar.volume);

  return {
    macd: MACD(close),
    rsi: RSI(close),
    stochastic: Stochastic(high, low, close),
    bollingerBands: BollingerBands(close),
    atr: ATR(high, low, close),
    adx: ADX(high, low, close),
    obv: OBV(close, volume),
    vwap: VWAP(high, low, close, volume),
  };
}
