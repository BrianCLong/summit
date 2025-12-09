import { toASCII } from 'punycode';

export type IoCType = 'ip' | 'domain' | 'sha256' | 'url' | 'email';

/**
 * Normalize indicator values into a canonical form for deduplication.
 *
 * This function standardizes the format of various IoC types (e.g., lowercasing domains,
 * trimming whitespace from IPs) to ensure consistent storage and querying.
 *
 * @param type - The type of Indicator of Compromise (ip, domain, sha256, url, email).
 * @param v - The raw IoC value to normalize.
 * @returns The normalized IoC string.
 */
export function normalizeIoC(type: IoCType, v: string): string {
  switch (type) {
    case 'ip':
      return v.trim();
    case 'domain':
      return toASCII(v.toLowerCase());
    case 'sha256':
      return v.toLowerCase();
    case 'url':
      try {
        return new URL(v).toString();
      } catch {
        return v;
      }
    case 'email':
      return v.toLowerCase().replace(/\+.*@/, '@');
    default:
      return v;
  }
}

/**
 * Fuses multiple confidence scores into a single aggregate probability score.
 *
 * Uses a probabilistic OR logic (1 - product of failure probabilities) to combine scores.
 * This effectively calculates the probability that at least one of the indicators is correct.
 *
 * @param confidences - An array of confidence values ranging from 0 to 100.
 * @returns An aggregated confidence score between 0 and 100, rounded to the nearest integer.
 */
export function fuse(confidences: number[]): number {
  const probs = confidences.map((c) => {
    const clamped = Math.min(Math.max(c, 0), 100);
    return clamped / 100;
  });
  const combined = 1 - probs.reduce((acc, p) => acc * (1 - p), 1);
  return Math.round(combined * 100);
}
