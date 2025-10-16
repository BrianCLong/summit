export function clampValue(value: number, min = 0, max = 1): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

export function dotProduct(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let total = 0;
  for (let index = 0; index < length; index += 1) {
    total += a[index] * b[index];
  }
  return total;
}

export function magnitude(vector: number[]): number {
  let total = 0;
  for (const value of vector) {
    total += value * value;
  }
  return Math.sqrt(total);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }
  const denominator = magnitude(a) * magnitude(b);
  if (denominator === 0) {
    return 0;
  }
  return clampValue(dotProduct(a, b) / denominator, -1, 1);
}

export type TokenEstimator = (text: string) => number;

export const defaultTokenEstimator: TokenEstimator = text =>
  text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
