import crypto from 'node:crypto';

function stableStringify(value: any): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const entries = keys.map((k) => `${k}:${stableStringify(value[k])}`);
    return `{${entries.join(',')}}`;
  }
  return String(value);
}

export function hashPart(part: any): string {
  return crypto.createHash('sha1').update(stableStringify(part)).digest('hex');
}

export function buildDeterministicCacheKey(namespace: string, ...parts: any[]): string {
  const normalized = parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : stableStringify(parts);
  const hash = crypto.createHash('sha1').update(`${namespace}:${normalized}`).digest('hex');
  return `${namespace}:${hash}`;
}

export function buildScopedCacheKey(namespace: string, tenant: string | undefined, ...parts: any[]): string {
  const scopedParts = tenant ? [tenant, ...parts] : parts;
  return buildDeterministicCacheKey(namespace, scopedParts);
}

export function stableObjectKey(value: any): string {
  return stableStringify(value);
}
