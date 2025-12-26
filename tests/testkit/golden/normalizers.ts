import crypto from 'crypto';

export type Normalizer = (input: unknown) => unknown;

const ISO_DATE_REGEX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g;
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys).sort((a, b) => {
      const aString = JSON.stringify(a);
      const bString = JSON.stringify(b);
      return aString.localeCompare(bString);
    });
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

export function normalizeTimestamps(payload: unknown): unknown {
  if (typeof payload === 'string') {
    return payload.replace(ISO_DATE_REGEX, '<ISO_TIMESTAMP>');
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizeTimestamps);
  }

  if (payload && typeof payload === 'object') {
    return Object.entries(payload as Record<string, unknown>).reduce(
      (acc, [key, value]) => {
        acc[key] = normalizeTimestamps(value);
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  return payload;
}

export function maskUuids(payload: unknown): unknown {
  if (typeof payload === 'string') {
    return payload.replace(UUID_REGEX, '<UUID>');
  }

  if (Array.isArray(payload)) {
    return payload.map(maskUuids);
  }

  if (payload && typeof payload === 'object') {
    return Object.entries(payload as Record<string, unknown>).reduce(
      (acc, [key, value]) => {
        acc[key] = maskUuids(value);
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  return payload;
}

export function canonicalizeOrder(payload: unknown): unknown {
  return sortObjectKeys(payload);
}

export function deterministicNormalize(payload: unknown): unknown {
  const normalized = canonicalizeOrder(maskUuids(normalizeTimestamps(payload)));
  return normalized;
}

export function stableHash(payload: unknown): string {
  const normalized = deterministicNormalize(payload);
  const serialized = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}
