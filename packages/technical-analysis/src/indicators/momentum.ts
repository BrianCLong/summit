import { sma, ema } from '../utils';

/**
 * RSI (Relative Strength Index)
 */
export function RSI(close: number[], period: number = 14): number[] {
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < close.length; i++) {
    const change = close[i] - close[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  const avgGains = ema(gains, period);
  const avgLosses = ema(losses, period);

  const rs = avgGains.map((gain, i) => {
    return avgLosses[i] === 0 ? 100 : gain / avgLosses[i];
  });

  const rsi = rs.map(r => 100 - (100 / (1 + r)));

  return [NaN].concat(rsi); // Pad with NaN for first element
}

/**
 * Stochastic Oscillator
 */
export interface StochasticResult {
  k: number[];
  d: number[];
}

export function Stochastic(
  high: number[],
  low: number[],
  close: number[],
  kPeriod: number = 14,
  dPeriod: number = 3,
  smoothK: number = 3
): StochasticResult {
  const k: number[] = [];

  for (let i = 0; i < close.length; i++) {
    if (i < kPeriod - 1) {
      k.push(NaN);
      continue;
    }

    const highestHigh = Math.max(...high.slice(i - kPeriod + 1, i + 1));
    const lowestLow = Math.min(...low.slice(i - kPeriod + 1, i + 1));

    const stoch = ((close[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
    k.push(stoch);
  }

  // Smooth %K
  const smoothedK = sma(k.filter(v => !isNaN(v)), smoothK);
  const paddedK = new Array(k.length - smoothedK.length).fill(NaN).concat(smoothedK);

  // Calculate %D (moving average of %K)
  const d = sma(paddedK.filter(v => !isNaN(v)), dPeriod);
  const paddedD = new Array(paddedK.length - d.length).fill(NaN).concat(d);

  return {
    k: paddedK,
    d: paddedD,
  };
}

/**
 * Williams %R
 */
export function WilliamsR(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): number[] {
  const result: number[] = [];

  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    const highestHigh = Math.max(...high.slice(i - period + 1, i + 1));
    const lowestLow = Math.min(...low.slice(i - period + 1, i + 1));

    const wr = ((highestHigh - close[i]) / (highestHigh - lowestLow)) * -100;
    result.push(wr);
  }

  return result;
}

/**
 * CCI (Commodity Channel Index)
 */
export function CCI(
  high: number[],
  low: number[],
  close: number[],
  period: number = 20
): number[] {
  const result: number[] = [];
  const tp = close.map((c, i) => (high[i] + low[i] + c) / 3); // Typical Price
  const tpSMA = sma(tp, period);

  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    const slice = tp.slice(i - period + 1, i + 1);
    const meanDev = slice.reduce((sum, v) => sum + Math.abs(v - tpSMA[i]), 0) / period;

    const cci = (tp[i] - tpSMA[i]) / (0.015 * meanDev);
    result.push(cci);
  }

  return result;
}

/**
 * ROC (Rate of Change)
 */
export function ROC(close: number[], period: number = 12): number[] {
  const result: number[] = [];

  for (let i = 0; i < close.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else {
      const roc = ((close[i] - close[i - period]) / close[i - period]) * 100;
      result.push(roc);
    }
  }

  return result;
}

/**
 * Momentum
 */
export function Momentum(close: number[], period: number = 10): number[] {
  const result: number[] = [];

  for (let i = 0; i < close.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else {
      result.push(close[i] - close[i - period]);
    }
  }

  return result;
}

/**
 * Ultimate Oscillator
 */
export function UltimateOscillator(
  high: number[],
  low: number[],
  close: number[],
  period1: number = 7,
  period2: number = 14,
  period3: number = 28
): number[] {
  const result: number[] = [];
  const bp: number[] = []; // Buying Pressure
  const tr: number[] = []; // True Range

  for (let i = 1; i < close.length; i++) {
    const trueHigh = Math.max(high[i], close[i - 1]);
    const trueLow = Math.min(low[i], close[i - 1]);

    bp.push(close[i] - trueLow);
    tr.push(trueHigh - trueLow);
  }

  const calcAvg = (data: number[], period: number, index: number): number => {
    if (index < period - 1) return NaN;
    return data.slice(index - period + 1, index + 1).reduce((a, b) => a + b, 0);
  };

  for (let i = 0; i < bp.length; i++) {
    if (i < period3 - 1) {
      result.push(NaN);
      continue;
    }

    const avg1 = calcAvg(bp, period1, i) / calcAvg(tr, period1, i);
    const avg2 = calcAvg(bp, period2, i) / calcAvg(tr, period2, i);
    const avg3 = calcAvg(bp, period3, i) / calcAvg(tr, period3, i);

    const uo = ((4 * avg1 + 2 * avg2 + avg3) / 7) * 100;
    result.push(uo);
  }

  return [NaN].concat(result);
}

/**
 * Money Flow Index (MFI)
 */
export function MFI(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
  period: number = 14
): number[] {
  const result: number[] = [];
  const typicalPrice = close.map((c, i) => (high[i] + low[i] + c) / 3);
  const rawMoneyFlow = typicalPrice.map((tp, i) => tp * volume[i]);

  for (let i = 1; i < close.length; i++) {
    if (i < period) {
      result.push(NaN);
      continue;
    }

    let positiveFlow = 0;
    let negativeFlow = 0;

    for (let j = i - period + 1; j <= i; j++) {
      if (typicalPrice[j] > typicalPrice[j - 1]) {
        positiveFlow += rawMoneyFlow[j];
      } else {
        negativeFlow += rawMoneyFlow[j];
      }
    }

    const moneyFlowRatio = positiveFlow / negativeFlow;
    const mfi = 100 - (100 / (1 + moneyFlowRatio));
    result.push(mfi);
  }

  return [NaN].concat(result);
}

/**
 * Awesome Oscillator
 */
export function AwesomeOscillator(high: number[], low: number[]): number[] {
  const medianPrice = high.map((h, i) => (h + low[i]) / 2);
  const sma5 = sma(medianPrice, 5);
  const sma34 = sma(medianPrice, 34);

  return sma5.map((s5, i) => s5 - sma34[i]);
}

/**
 * TSI (True Strength Index)
 */
export function TSI(
  close: number[],
  longPeriod: number = 25,
  shortPeriod: number = 13
): number[] {
  const momentum: number[] = [];

  for (let i = 1; i < close.length; i++) {
    momentum.push(close[i] - close[i - 1]);
  }

  const emaLong = ema(momentum, longPeriod);
  const emaShort = ema(emaLong.filter(v => !isNaN(v)), shortPeriod);

  const absMomentum = momentum.map(m => Math.abs(m));
  const emaLongAbs = ema(absMomentum, longPeriod);
  const emaShortAbs = ema(emaLongAbs.filter(v => !isNaN(v)), shortPeriod);

  const tsi = emaShort.map((num, i) => (num / emaShortAbs[i]) * 100);

  const padLength = close.length - tsi.length;
  return new Array(padLength).fill(NaN).concat(tsi);
}
