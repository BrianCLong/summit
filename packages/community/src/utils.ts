import { randomUUID } from 'node:crypto';

export const createId = (prefix: string): string => `${prefix}_${randomUUID()}`;

export const clamp = (
  value: number,
  minimum: number,
  maximum: number,
): number => {
  if (value < minimum) {
    return minimum;
  }
  if (value > maximum) {
    return maximum;
  }
  return value;
};

export const normalizeText = (value: string): string =>
  value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const scoreMatch = (query: string, target: string): number => {
  const normalizedQuery = normalizeText(query);
  const normalizedTarget = normalizeText(target);
  if (!normalizedQuery || !normalizedTarget) {
    return 0;
  }

  if (normalizedTarget.includes(normalizedQuery)) {
    return normalizedQuery.length / normalizedTarget.length;
  }

  let score = 0;
  for (const token of normalizedQuery.split(' ')) {
    if (normalizedTarget.includes(token)) {
      score += token.length / normalizedTarget.length;
    }
  }

  return score;
};

export const sum = (values: Iterable<number>): number => {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total;
};
