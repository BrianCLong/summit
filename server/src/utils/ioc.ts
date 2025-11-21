import { toASCII } from 'punycode';

/**
 * Supported types of Indicators of Compromise (IoCs).
 */
export type IoCType = 'ip' | 'domain' | 'sha256' | 'url' | 'email';

/**
 * Normalize indicator values into a canonical form for deduplication.
 *
 * @param {IoCType} type - Type of IoC (ip, domain, sha256, url, email).
 * @param {string} v - Raw IoC value.
 * @returns {string} The normalized IoC value.
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
 * Fuse multiple confidence scores into a single probability.
 * Uses a probabilistic combination (noisy OR) to calculate the combined confidence.
 *
 * @param {number[]} confidences - Array of confidence values (0-100).
 * @returns {number} The fused confidence score (0-100).
 */
export function fuse(confidences: number[]): number {
  const probs = confidences.map((c) => {
    const clamped = Math.min(Math.max(c, 0), 100);
    return clamped / 100;
  });
  const combined = 1 - probs.reduce((acc, p) => acc * (1 - p), 1);
  return Math.round(combined * 100);
}
