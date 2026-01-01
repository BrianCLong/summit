import { MemoryRecord } from '../types.js';

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const buildVector = (tokens: string[]): Map<string, number> => {
  const vector = new Map<string, number>();
  tokens.forEach((token) => {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  });
  return vector;
};

export const embedText = (text: string): Map<string, number> => buildVector(tokenize(text));

const magnitude = (vector: Map<string, number>): number => {
  let sum = 0;
  vector.forEach((value) => {
    sum += value * value;
  });
  return Math.sqrt(sum);
};

const dotProduct = (a: Map<string, number>, b: Map<string, number>): number => {
  let sum = 0;
  a.forEach((value, key) => {
    const other = b.get(key);
    if (other !== undefined) {
      sum += value * other;
    }
  });
  return sum;
};

export const cosineSimilarity = (a: Map<string, number>, b: Map<string, number>): number => {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
};

export const applyRecencyBoost = (score: number, record: MemoryRecord): number => {
  const now = Date.now();
  const ageMs = now - record.createdAt.getTime();
  const days = ageMs / (1000 * 60 * 60 * 24);
  const decay = Math.max(0.5, Math.exp(-days / 30));
  return score * (1 + 0.2 * decay);
};
