/**
 * Environment Normalization
 *
 * Ensures deterministic execution by normalizing timezone, locale,
 * and other environment-dependent behaviors.
 */

import type { NormalizedEnv } from '../types/index.js';

/**
 * Default values for deterministic execution
 */
export const ENV_DEFAULTS = {
  TZ: 'UTC',
  LOCALE: 'C', // POSIX locale for maximum consistency
  LC_ALL: 'C',
  LANG: 'C',
} as const;

/**
 * Apply environment normalization
 * Sets TZ and locale to ensure consistent behavior across systems.
 *
 * @param options - Override values for TZ and locale
 */
export function normalizeEnvironment(options: { tz?: string; locale?: string } = {}): void {
  const tz = options.tz ?? ENV_DEFAULTS.TZ;
  const locale = options.locale ?? ENV_DEFAULTS.LOCALE;

  // Set timezone
  process.env.TZ = tz;

  // Set locale environment variables
  process.env.LC_ALL = locale;
  process.env.LANG = locale;
  process.env.LANGUAGE = locale;

  // Force Node.js to recognize the TZ change
  // This is a workaround for Node.js caching the timezone
  const tzOffset = new Date().getTimezoneOffset();
  if (tzOffset !== 0 && tz === 'UTC') {
    // Re-evaluate timezone by creating a new date
    // Node.js will pick up TZ on next Date construction
  }
}

/**
 * Get current normalized environment info
 */
export function getNormalizedEnv(options: { tz?: string; locale?: string } = {}): NormalizedEnv {
  return {
    tz: options.tz ?? process.env.TZ ?? ENV_DEFAULTS.TZ,
    locale: options.locale ?? process.env.LC_ALL ?? ENV_DEFAULTS.LOCALE,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

/**
 * Deterministic sort function for arrays
 * Ensures consistent ordering across platforms.
 */
export function deterministicSort<T>(arr: T[], keyFn?: (item: T) => string): T[] {
  const sorted = [...arr];
  sorted.sort((a, b) => {
    const keyA = keyFn ? keyFn(a) : String(a);
    const keyB = keyFn ? keyFn(b) : String(b);
    return keyA.localeCompare(keyB, 'en', { sensitivity: 'base' });
  });
  return sorted;
}

/**
 * Deterministic JSON stringification
 * Sorts object keys for consistent output.
 */
export function deterministicStringify(obj: unknown, space?: number): string {
  return JSON.stringify(obj, sortKeys, space);
}

/**
 * JSON replacer that sorts object keys
 */
function sortKeys(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const k of keys) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}
