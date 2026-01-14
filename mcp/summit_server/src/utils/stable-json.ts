export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const isPlainObject = (value: JsonValue): value is { [key: string]: JsonValue } =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const stableSortValue = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map((entry) => stableSortValue(entry));
  }
  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, JsonValue>>((acc, key) => {
        acc[key] = stableSortValue(value[key]);
        return acc;
      }, {});
  }
  return value;
};

export const stableStringify = (value: JsonValue): string =>
  JSON.stringify(stableSortValue(value));
