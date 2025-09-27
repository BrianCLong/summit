import crypto from 'node:crypto';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export function canonicalize(value: Json): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: Json): Json {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === 'object') {
    const sortedEntries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortJson(v)] as const);
    return Object.fromEntries(sortedEntries);
  }

  return value;
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function hmacSha256(secret: string, input: string): string {
  return crypto.createHmac('sha256', secret).update(input).digest('hex');
}
