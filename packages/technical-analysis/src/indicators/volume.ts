import { sma, ema } from '../utils';

/**
 * OBV (On-Balance Volume)
 */
export function OBV(close: number[], volume: number[]): number[] {
  const obv: number[] = [volume[0]];

  for (let i = 1; i < close.length; i++) {
    if (close[i] > close[i - 1]) {
      obv.push(obv[i - 1] + volume[i]);
    } else if (close[i] < close[i - 1]) {
      obv.push(obv[i - 1] - volume[i]);
    } else {
      obv.push(obv[i - 1]);
    }
  }

  return obv;
}

/**
 * Accumulation/Distribution Line (ADL)
 */
export function ADL(
  high: number[],
  low: number[],
  close: number[],
  volume: number[]
): number[] {
  const adl: number[] = [0];

  for (let i = 0; i < close.length; i++) {
    const clv = ((close[i] - low[i]) - (high[i] - close[i])) / (high[i] - low[i]);
    const ad = clv * volume[i];

    if (i === 0) {
      adl[0] = ad;
    } else {
      adl.push(adl[i - 1] + ad);
    }
  }

  return adl;
}

/**
 * Chaikin Money Flow (CMF)
 */
export function CMF(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
  period: number = 20
): number[] {
  const result: number[] = [];

  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    let sumMFV = 0;
    let sumVolume = 0;

    for (let j = i - period + 1; j <= i; j++) {
      const clv = ((close[j] - low[j]) - (high[j] - close[j])) / (high[j] - low[j]);
      sumMFV += clv * volume[j];
      sumVolume += volume[j];
    }

    result.push(sumVolume !== 0 ? sumMFV / sumVolume : 0);
  }

  return result;
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function VWAP(
  high: number[],
  low: number[],
  close: number[],
  volume: number[]
): number[] {
  const typicalPrice = close.map((c, i) => (high[i] + low[i] + c) / 3);
  const tpv = typicalPrice.map((tp, i) => tp * volume[i]);

  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  const vwap: number[] = [];

  for (let i = 0; i < close.length; i++) {
    cumulativeTPV += tpv[i];
    cumulativeVolume += volume[i];

    vwap.push(cumulativeVolume !== 0 ? cumulativeTPV / cumulativeVolume : 0);
  }

  return vwap;
}

/**
 * Volume Oscillator
 */
export function VolumeOscillator(
  volume: number[],
  shortPeriod: number = 5,
  longPeriod: number = 10
): number[] {
  const shortEma = ema(volume, shortPeriod);
  const longEma = ema(volume, longPeriod);

  return shortEma.map((short, i) => {
    return longEma[i] !== 0 ? ((short - longEma[i]) / longEma[i]) * 100 : NaN;
  });
}

/**
 * Volume Rate of Change (VROC)
 */
export function VROC(volume: number[], period: number = 14): number[] {
  const result: number[] = [];

  for (let i = 0; i < volume.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else {
      const vroc = ((volume[i] - volume[i - period]) / volume[i - period]) * 100;
      result.push(vroc);
    }
  }

  return result;
}

/**
 * Ease of Movement (EOM)
 */
export function EaseOfMovement(
  high: number[],
  low: number[],
  volume: number[],
  period: number = 14
): number[] {
  const eom: number[] = [];

  for (let i = 1; i < high.length; i++) {
    const midpointMove = ((high[i] + low[i]) / 2) - ((high[i - 1] + low[i - 1]) / 2);
    const boxRatio = (volume[i] / 100000000) / (high[i] - low[i]);

    eom.push(boxRatio !== 0 ? midpointMove / boxRatio : 0);
  }

  const smoothedEom = sma([0].concat(eom), period);
  return smoothedEom;
}

/**
 * Force Index
 */
export function ForceIndex(
  close: number[],
  volume: number[],
  period: number = 13
): number[] {
  const force: number[] = [];

  for (let i = 1; i < close.length; i++) {
    force.push((close[i] - close[i - 1]) * volume[i]);
  }

  const smoothedForce = ema([0].concat(force), period);
  return smoothedForce;
}

/**
 * Negative Volume Index (NVI)
 */
export function NVI(close: number[], volume: number[]): number[] {
  const nvi: number[] = [1000];

  for (let i = 1; i < close.length; i++) {
    if (volume[i] < volume[i - 1]) {
      const roc = (close[i] - close[i - 1]) / close[i - 1];
      nvi.push(nvi[i - 1] + (nvi[i - 1] * roc));
    } else {
      nvi.push(nvi[i - 1]);
    }
  }

  return nvi;
}

/**
 * Positive Volume Index (PVI)
 */
export function PVI(close: number[], volume: number[]): number[] {
  const pvi: number[] = [1000];

  for (let i = 1; i < close.length; i++) {
    if (volume[i] > volume[i - 1]) {
      const roc = (close[i] - close[i - 1]) / close[i - 1];
      pvi.push(pvi[i - 1] + (pvi[i - 1] * roc));
    } else {
      pvi.push(pvi[i - 1]);
    }
  }

  return pvi;
}

/**
 * Volume-Weighted Moving Average (VWMA)
 */
export function VWMA(close: number[], volume: number[], period: number = 20): number[] {
  const result: number[] = [];

  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    let sumPV = 0;
    let sumV = 0;

    for (let j = i - period + 1; j <= i; j++) {
      sumPV += close[j] * volume[j];
      sumV += volume[j];
    }

    result.push(sumV !== 0 ? sumPV / sumV : NaN);
  }

  return result;
}

/**
 * Klinger Oscillator
 */
export function KlingerOscillator(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
  fastPeriod: number = 34,
  slowPeriod: number = 55,
  signalPeriod: number = 13
): { klinger: number[]; signal: number[] } {
  const vf: number[] = []; // Volume Force
  const cm: number[] = []; // Cumulative Measurement

  for (let i = 1; i < close.length; i++) {
    const typicalPrice = (high[i] + low[i] + close[i]) / 3;
    const prevTypicalPrice = (high[i - 1] + low[i - 1] + close[i - 1]) / 3;

    const trend = typicalPrice > prevTypicalPrice ? 1 : -1;
    const dm = high[i] - low[i];

    if (i === 1) {
      cm.push(dm);
    } else {
      cm.push(trend === vf[i - 2] ? cm[i - 2] + dm : dm - cm[i - 2]);
    }

    vf.push(trend);
  }

  const volumeForce = volume.slice(1).map((v, i) => {
    return cm[i] !== 0 ? v * Math.abs(2 * (dm[i] / cm[i]) - 1) * vf[i] * 100 : 0;
  });

  const fastEma = ema([0].concat(volumeForce), fastPeriod);
  const slowEma = ema([0].concat(volumeForce), slowPeriod);
  const klinger = fastEma.map((fast, i) => fast - slowEma[i]);
  const signal = ema(klinger.filter(v => !isNaN(v)), signalPeriod);

  const paddedSignal = new Array(klinger.length - signal.length).fill(NaN).concat(signal);

  return {
    klinger,
    signal: paddedSignal,
  };

  function dm(index: number): number {
    return high[index + 1] - low[index + 1];
  }
}
