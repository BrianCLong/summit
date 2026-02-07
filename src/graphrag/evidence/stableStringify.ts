type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function sortValue(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortValue(record[key]);
    }
    return sorted;
  }

  return String(value);
}

export function stableStringify(value: unknown): string {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}
