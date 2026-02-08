type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function sortValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    const sorted: { [key: string]: JsonValue } = {};
    for (const [key, entryValue] of entries) {
      sorted[key] = sortValue(entryValue as JsonValue);
    }
    return sorted;
  }

  return value;
}

export function stableStringify(value: JsonValue): string {
  return JSON.stringify(sortValue(value));
}
