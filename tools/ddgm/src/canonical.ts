import crypto from 'crypto';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function canonicalize(value: unknown): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item)) as JsonValue;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    const normalized: Record<string, JsonValue> = {};
    for (const [key, val] of entries) {
      normalized[key] = canonicalize(val);
    }
    return normalized;
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return null;
    }
    return Number(value) as JsonValue;
  }

  return value as JsonValue;
}

export function canonicalJsonString(value: unknown): string {
  const canonical = canonicalize(value);
  return JSON.stringify(canonical);
}

export function sha256Base64(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('base64');
}
