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
    const entries = Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortValue(child)]);
    return Object.fromEntries(entries);
  }

  return value;
}

export function stableStringify(value: JsonValue): string {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}
