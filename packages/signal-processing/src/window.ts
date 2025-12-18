import { NumericArray, WindowFunction, WindowKind } from './types.js';

function generateWindow(kind: WindowKind, size: number): Float64Array {
  if (size <= 0) {
    throw new Error('Window size must be positive');
  }
  const w = new Float64Array(size);
  switch (kind) {
    case 'rectangular':
      w.fill(1);
      break;
    case 'hann':
      for (let n = 0; n < size; n += 1) {
        w[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (size - 1)));
      }
      break;
    case 'hamming':
      for (let n = 0; n < size; n += 1) {
        w[n] = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (size - 1));
      }
      break;
    default:
      throw new Error(`Unsupported window kind: ${kind satisfies never}`);
  }
  return w;
}

export function createWindow(kind: WindowKind, size: number): WindowFunction {
  return { kind, values: generateWindow(kind, size) };
}

export function applyWindow(data: NumericArray, window: WindowFunction): Float64Array {
  const src = data instanceof Float64Array ? data : Float64Array.from(data);
  const size = window.values.length;
  const out = new Float64Array(size);
  for (let i = 0; i < size; i += 1) {
    out[i] = (src[i] ?? 0) * window.values[i];
  }
  return out;
}

export function normalizeFrame(data: NumericArray, size: number): Float64Array {
  const src = data instanceof Float64Array ? data : Float64Array.from(data);
  if (src.length === size) {
    return src;
  }
  const normalized = new Float64Array(size);
  normalized.set(src.slice(0, size));
  return normalized;
}
