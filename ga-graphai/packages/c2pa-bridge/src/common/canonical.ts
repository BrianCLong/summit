export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalize(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }
  if (isObject(value)) {
    const sortedKeys = Object.keys(value).sort();
    const normalized: { [key: string]: JsonValue } = {};
    for (const key of sortedKeys) {
      const current = (value as Record<string, unknown>)[key];
      if (current === undefined) {
        continue;
      }
      normalized[key] = normalize(current);
    }
    return normalized;
  }
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

export function canonicalize(value: unknown): string {
  const normalized = normalize(value);
  return JSON.stringify(normalized);
}
