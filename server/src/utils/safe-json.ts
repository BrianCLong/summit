/**
 * Safe JSON utilities to prevent crash on circular references or invalid input
 */

export function safeJsonParse<T>(val: string, fallback: T | null = null): T | null {
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(val: unknown, fallback: string = '{}'): string {
  try {
    return JSON.stringify(val);
  } catch {
    return fallback;
  }
}
