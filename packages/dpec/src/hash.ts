import { createHash } from 'crypto';

export type JsonPrimitive = string | number | boolean | null;

function canonicalize(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return 'NaN';
    }
    if (!Number.isFinite(value)) {
      return value > 0 ? 'Infinity' : '-Infinity';
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'bigint') {
    return `${value.toString()}n`;
  }
  if (typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }
  if (value instanceof Date) {
    return `{"$date":${JSON.stringify(value.toISOString())}}`;
  }
  if (value instanceof Map) {
    const entries = Array.from(value.entries()).sort(([a], [b]) =>
      canonicalize(a).localeCompare(canonicalize(b))
    );
    return `{"$map":${canonicalize(entries)}}`;
  }
  if (value instanceof Set) {
    const items = Array.from(value.values()).sort((a, b) =>
      canonicalize(a).localeCompare(canonicalize(b))
    );
    return `{"$set":${canonicalize(items)}}`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${canonicalize(val)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function stableStringify(value: unknown): string {
  return canonicalize(value);
}

export function sha256(data: Buffer | string): string {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;
  return createHash('sha256').update(buffer).digest('hex');
}

export function canonicalDigest(value: unknown): string {
  return sha256(Buffer.from(stableStringify(value)));
}
