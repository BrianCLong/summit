import crypto from 'node:crypto';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    const entries = keys.map((key) => `"${key}":${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
};

export const hashString = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

export const hashObject = (value: unknown): string => hashString(stableStringify(value));
