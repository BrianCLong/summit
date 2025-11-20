import { OHLCV } from '@intelgraph/market-data';
import { sma, ema, linearRegression } from '../utils';

/**
 * MACD (Moving Average Convergence Divergence)
 */
export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function MACD(
  close: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const fastEMA = ema(close, fastPeriod);
  const slowEMA = ema(close, slowPeriod);

  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = ema(macdLine.filter(v => !isNaN(v)), signalPeriod);

  // Pad signal line with NaN to match length
  const paddedSignal = new Array(macdLine.length - signalLine.length).fill(NaN).concat(signalLine);

  const histogram = macdLine.map((macd, i) => macd - (paddedSignal[i] || 0));

  return {
    macd: macdLine,
    signal: paddedSignal,
    histogram,
  };
}

/**
 * ADX (Average Directional Index)
 */
export interface ADXResult {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
}

export function ADX(high: number[], low: number[], close: number[], period: number = 14): ADXResult {
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];

  // Calculate +DM, -DM, and TR
  for (let i = 1; i < high.length; i++) {
    const highDiff = high[i] - high[i - 1];
    const lowDiff = low[i - 1] - low[i];

    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

    const hl = high[i] - low[i];
    const hc = Math.abs(high[i] - close[i - 1]);
    const lc = Math.abs(low[i] - close[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }

  // Smooth +DM, -DM, and TR
  const smoothedPlusDM = ema(plusDM, period);
  const smoothedMinusDM = ema(minusDM, period);
  const smoothedTR = ema(tr, period);

  // Calculate +DI and -DI
  const plusDI = smoothedPlusDM.map((dm, i) => (dm / smoothedTR[i]) * 100);
  const minusDI = smoothedMinusDM.map((dm, i) => (dm / smoothedTR[i]) * 100);

  // Calculate DX
  const dx = plusDI.map((plus, i) => {
    const sum = plus + minusDI[i];
    return sum === 0 ? 0 : (Math.abs(plus - minusDI[i]) / sum) * 100;
  });

  // Calculate ADX
  const adx = ema(dx.filter(v => !isNaN(v)), period);

  // Pad results
  const padLength = high.length - adx.length;
  const paddedADX = new Array(padLength).fill(NaN).concat(adx);
  const paddedPlusDI = [NaN].concat(plusDI);
  const paddedMinusDI = [NaN].concat(minusDI);

  return {
    adx: paddedADX,
    plusDI: paddedPlusDI,
    minusDI: paddedMinusDI,
  };
}

/**
 * Parabolic SAR
 */
export function ParabolicSAR(
  high: number[],
  low: number[],
  close: number[],
  acceleration: number = 0.02,
  maximum: number = 0.2
): number[] {
  const sar: number[] = [];
  let isUptrend = close[1] > close[0];
  let ep = isUptrend ? high[0] : low[0];
  let af = acceleration;
  let currentSAR = isUptrend ? low[0] : high[0];

  sar.push(currentSAR);

  for (let i = 1; i < close.length; i++) {
    currentSAR = currentSAR + af * (ep - currentSAR);

    if (isUptrend) {
      if (low[i] < currentSAR) {
        isUptrend = false;
        currentSAR = ep;
        ep = low[i];
        af = acceleration;
      } else {
        if (high[i] > ep) {
          ep = high[i];
          af = Math.min(af + acceleration, maximum);
        }
      }
    } else {
      if (high[i] > currentSAR) {
        isUptrend = true;
        currentSAR = ep;
        ep = high[i];
        af = acceleration;
      } else {
        if (low[i] < ep) {
          ep = low[i];
          af = Math.min(af + acceleration, maximum);
        }
      }
    }

    sar.push(currentSAR);
  }

  return sar;
}

/**
 * Ichimoku Cloud
 */
export interface IchimokuResult {
  tenkanSen: number[];
  kijunSen: number[];
  senkouSpanA: number[];
  senkouSpanB: number[];
  chikouSpan: number[];
}

export function Ichimoku(
  high: number[],
  low: number[],
  close: number[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52
): IchimokuResult {
  const tenkanSen: number[] = [];
  const kijunSen: number[] = [];
  const senkouSpanA: number[] = [];
  const senkouSpanB: number[] = [];
  const chikouSpan = close.slice();

  for (let i = 0; i < high.length; i++) {
    // Tenkan-sen (Conversion Line)
    if (i >= tenkanPeriod - 1) {
      const maxHigh = Math.max(...high.slice(i - tenkanPeriod + 1, i + 1));
      const minLow = Math.min(...low.slice(i - tenkanPeriod + 1, i + 1));
      tenkanSen.push((maxHigh + minLow) / 2);
    } else {
      tenkanSen.push(NaN);
    }

    // Kijun-sen (Base Line)
    if (i >= kijunPeriod - 1) {
      const maxHigh = Math.max(...high.slice(i - kijunPeriod + 1, i + 1));
      const minLow = Math.min(...low.slice(i - kijunPeriod + 1, i + 1));
      kijunSen.push((maxHigh + minLow) / 2);
    } else {
      kijunSen.push(NaN);
    }

    // Senkou Span A (Leading Span A) - shifted forward 26 periods
    if (!isNaN(tenkanSen[i]) && !isNaN(kijunSen[i])) {
      senkouSpanA.push((tenkanSen[i] + kijunSen[i]) / 2);
    } else {
      senkouSpanA.push(NaN);
    }

    // Senkou Span B (Leading Span B)
    if (i >= senkouBPeriod - 1) {
      const maxHigh = Math.max(...high.slice(i - senkouBPeriod + 1, i + 1));
      const minLow = Math.min(...low.slice(i - senkouBPeriod + 1, i + 1));
      senkouSpanB.push((maxHigh + minLow) / 2);
    } else {
      senkouSpanB.push(NaN);
    }
  }

  return {
    tenkanSen,
    kijunSen,
    senkouSpanA,
    senkouSpanB,
    chikouSpan,
  };
}

/**
 * Aroon Indicator
 */
export interface AroonResult {
  aroonUp: number[];
  aroonDown: number[];
  aroonOscillator: number[];
}

export function Aroon(high: number[], low: number[], period: number = 25): AroonResult {
  const aroonUp: number[] = [];
  const aroonDown: number[] = [];
  const aroonOscillator: number[] = [];

  for (let i = 0; i < high.length; i++) {
    if (i < period - 1) {
      aroonUp.push(NaN);
      aroonDown.push(NaN);
      aroonOscillator.push(NaN);
      continue;
    }

    const slice = high.slice(i - period + 1, i + 1);
    const maxIdx = slice.indexOf(Math.max(...slice));
    const up = ((period - maxIdx - 1) / period) * 100;

    const lowSlice = low.slice(i - period + 1, i + 1);
    const minIdx = lowSlice.indexOf(Math.min(...lowSlice));
    const down = ((period - minIdx - 1) / period) * 100;

    aroonUp.push(up);
    aroonDown.push(down);
    aroonOscillator.push(up - down);
  }

  return {
    aroonUp,
    aroonDown,
    aroonOscillator,
  };
}

/**
 * SuperTrend Indicator
 */
export interface SuperTrendResult {
  supertrend: number[];
  trend: number[]; // 1 for uptrend, -1 for downtrend
}

export function SuperTrend(
  high: number[],
  low: number[],
  close: number[],
  period: number = 10,
  multiplier: number = 3
): SuperTrendResult {
  const atr = ATR(high, low, close, period);
  const hl2 = high.map((h, i) => (h + low[i]) / 2);

  const basicUpperBand = hl2.map((hl, i) => hl + multiplier * atr[i]);
  const basicLowerBand = hl2.map((hl, i) => hl - multiplier * atr[i]);

  const finalUpperBand: number[] = [];
  const finalLowerBand: number[] = [];
  const supertrend: number[] = [];
  const trend: number[] = [];

  for (let i = 0; i < close.length; i++) {
    if (i === 0) {
      finalUpperBand.push(basicUpperBand[i]);
      finalLowerBand.push(basicLowerBand[i]);
      supertrend.push(basicLowerBand[i]);
      trend.push(1);
    } else {
      const upper = basicUpperBand[i] < finalUpperBand[i - 1] || close[i - 1] > finalUpperBand[i - 1]
        ? basicUpperBand[i]
        : finalUpperBand[i - 1];

      const lower = basicLowerBand[i] > finalLowerBand[i - 1] || close[i - 1] < finalLowerBand[i - 1]
        ? basicLowerBand[i]
        : finalLowerBand[i - 1];

      finalUpperBand.push(upper);
      finalLowerBand.push(lower);

      if (supertrend[i - 1] === finalUpperBand[i - 1] && close[i] <= upper) {
        supertrend.push(upper);
        trend.push(-1);
      } else if (supertrend[i - 1] === finalUpperBand[i - 1] && close[i] > upper) {
        supertrend.push(lower);
        trend.push(1);
      } else if (supertrend[i - 1] === finalLowerBand[i - 1] && close[i] >= lower) {
        supertrend.push(lower);
        trend.push(1);
      } else {
        supertrend.push(upper);
        trend.push(-1);
      }
    }
  }

  return { supertrend, trend };
}

/**
 * ATR (Average True Range) - Helper function
 */
function ATR(high: number[], low: number[], close: number[], period: number): number[] {
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

  return ema(tr, period);
}
