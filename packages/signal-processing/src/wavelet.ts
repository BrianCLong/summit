import { NumericArray, WaveletLevel, WaveletResult } from './types.js';

export function haarTransform(signal: NumericArray, levels: number): WaveletResult {
  if (levels < 1) {
    throw new Error('Levels must be at least 1');
  }
  let working = signal instanceof Float64Array ? signal : Float64Array.from(signal);
  const results: WaveletLevel[] = [];

  for (let level = 0; level < levels && working.length >= 2; level += 1) {
    const half = Math.floor(working.length / 2);
    const approximation = new Float64Array(half);
    const detail = new Float64Array(half);

    for (let i = 0; i < half; i += 1) {
      const a = working[2 * i];
      const b = working[2 * i + 1];
      approximation[i] = (a + b) / Math.SQRT2;
      detail[i] = (a - b) / Math.SQRT2;
    }

    results.push({ approximation, detail });
    working = approximation;
  }

  return { levels: results, residual: working };
}

export function reconstructFromHaar({ levels, residual }: WaveletResult): Float64Array {
  let current = residual;
  for (let i = levels.length - 1; i >= 0; i -= 1) {
    const { detail } = levels[i];
    const next = new Float64Array(detail.length * 2);
    for (let j = 0; j < detail.length; j += 1) {
      next[2 * j] = (current[j] + detail[j]) / Math.SQRT2;
      next[2 * j + 1] = (current[j] - detail[j]) / Math.SQRT2;
    }
    current = next;
  }
  return current;
}
