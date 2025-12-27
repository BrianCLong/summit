import crypto from 'node:crypto';

/**
 * Produce a canonical JSON representation with sorted keys.
 */
export function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

/**
 * SHA-256 hex digest of a string.
 */
export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
