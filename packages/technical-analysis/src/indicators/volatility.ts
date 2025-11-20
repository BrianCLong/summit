import { sma, ema, standardDeviation, trueRange } from '../utils';

/**
 * Bollinger Bands
 */
export interface BollingerBandsResult {
  upper: number[];
  middle: number[];
  lower: number[];
  bandwidth: number[];
  percentB: number[];
}

export function BollingerBands(
  close: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsResult {
  const middle = sma(close, period);
  const sd = standardDeviation(close, period);

  const upper = middle.map((m, i) => m + stdDev * sd[i]);
  const lower = middle.map((m, i) => m - stdDev * sd[i]);

  // Bandwidth: (Upper Band - Lower Band) / Middle Band
  const bandwidth = upper.map((u, i) => {
    return middle[i] !== 0 ? ((u - lower[i]) / middle[i]) * 100 : NaN;
  });

  // %B: (Close - Lower Band) / (Upper Band - Lower Band)
  const percentB = close.map((c, i) => {
    const range = upper[i] - lower[i];
    return range !== 0 ? (c - lower[i]) / range : NaN;
  });

  return {
    upper,
    middle,
    lower,
    bandwidth,
    percentB,
  };
}

/**
 * ATR (Average True Range)
 */
export function ATR(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): number[] {
  const tr = trueRange(high, low, close);
  return ema(tr, period);
}

/**
 * Keltner Channels
 */
export interface KeltnerChannelResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function KeltnerChannel(
  high: number[],
  low: number[],
  close: number[],
  emaPeriod: number = 20,
  atrPeriod: number = 10,
  atrMultiplier: number = 2
): KeltnerChannelResult {
  const middle = ema(close, emaPeriod);
  const atr = ATR(high, low, close, atrPeriod);

  const upper = middle.map((m, i) => m + atrMultiplier * atr[i]);
  const lower = middle.map((m, i) => m - atrMultiplier * atr[i]);

  return {
    upper,
    middle,
    lower,
  };
}

/**
 * Standard Deviation
 */
export function StdDev(close: number[], period: number = 20): number[] {
  return standardDeviation(close, period);
}

/**
 * Historical Volatility
 */
export function HistoricalVolatility(
  close: number[],
  period: number = 20,
  annualizationFactor: number = 252
): number[] {
  const returns: number[] = [];

  for (let i = 1; i < close.length; i++) {
    returns.push(Math.log(close[i] / close[i - 1]));
  }

  const result: number[] = [];

  for (let i = 0; i < returns.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    const slice = returns.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / period;
    const volatility = Math.sqrt(variance * annualizationFactor) * 100;

    result.push(volatility);
  }

  return [NaN].concat(result);
}

/**
 * Donchian Channel
 */
export interface DonchianChannelResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function DonchianChannel(
  high: number[],
  low: number[],
  period: number = 20
): DonchianChannelResult {
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < high.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      upper.push(Math.max(...high.slice(i - period + 1, i + 1)));
      lower.push(Math.min(...low.slice(i - period + 1, i + 1)));
    }
  }

  const middle = upper.map((u, i) => (u + lower[i]) / 2);

  return {
    upper,
    middle,
    lower,
  };
}

/**
 * Chaikin Volatility
 */
export function ChaikinVolatility(
  high: number[],
  low: number[],
  emaPeriod: number = 10,
  rocPeriod: number = 10
): number[] {
  const hlRange = high.map((h, i) => h - low[i]);
  const emaRange = ema(hlRange, emaPeriod);

  const result: number[] = [];

  for (let i = 0; i < emaRange.length; i++) {
    if (i < rocPeriod || isNaN(emaRange[i]) || isNaN(emaRange[i - rocPeriod])) {
      result.push(NaN);
    } else {
      const chv = ((emaRange[i] - emaRange[i - rocPeriod]) / emaRange[i - rocPeriod]) * 100;
      result.push(chv);
    }
  }

  return result;
}

/**
 * Mass Index
 */
export function MassIndex(
  high: number[],
  low: number[],
  emaPeriod: number = 9,
  sumPeriod: number = 25
): number[] {
  const range = high.map((h, i) => h - low[i]);
  const singleEma = ema(range, emaPeriod);
  const doubleEma = ema(singleEma.filter(v => !isNaN(v)), emaPeriod);

  const ratio: number[] = [];
  let doubleIdx = 0;

  for (let i = 0; i < singleEma.length; i++) {
    if (isNaN(singleEma[i])) {
      ratio.push(NaN);
    } else {
      if (doubleIdx < doubleEma.length) {
        ratio.push(doubleEma[doubleIdx] !== 0 ? singleEma[i] / doubleEma[doubleIdx] : NaN);
        doubleIdx++;
      } else {
        ratio.push(NaN);
      }
    }
  }

  const result: number[] = [];

  for (let i = 0; i < ratio.length; i++) {
    if (i < sumPeriod - 1) {
      result.push(NaN);
      continue;
    }

    const sum = ratio.slice(i - sumPeriod + 1, i + 1)
      .filter(v => !isNaN(v))
      .reduce((a, b) => a + b, 0);

    result.push(sum);
  }

  return result;
}

/**
 * Ulcer Index
 */
export function UlcerIndex(close: number[], period: number = 14): number[] {
  const result: number[] = [];

  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    const slice = close.slice(i - period + 1, i + 1);
    const maxClose = Math.max(...slice);

    const percentDrawdowns = slice.map(c => ((c - maxClose) / maxClose) * 100);
    const squaredDrawdowns = percentDrawdowns.map(d => d * d);
    const avgSquaredDrawdown = squaredDrawdowns.reduce((a, b) => a + b, 0) / period;

    result.push(Math.sqrt(avgSquaredDrawdown));
  }

  return result;
}
