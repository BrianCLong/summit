// @ts-nocheck
import crypto from 'crypto';

export type CanonicalValue = string | number | boolean | null | CanonicalValue[] | { [key: string]: CanonicalValue };

// Recursively sort object keys to guarantee deterministic serialization across platforms
export function canonicalize(value: unknown): CanonicalValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (typeof value === 'object') {
    const sorted: Record<string, CanonicalValue> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return String(value);
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value: unknown): string {
  const serialized = typeof value === 'string' || Buffer.isBuffer(value) ? value : canonicalStringify(value);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

export function hmacSha256(secret: string, value: unknown): string {
  const serialized = canonicalStringify(value);
  return crypto.createHmac('sha256', secret).update(serialized).digest('hex');
}
