export const stableStringify = (value: unknown): string => {
  const seen = new WeakSet();

  const stringify = (input: unknown): unknown => {
    if (input === null || typeof input !== 'object') {
      return input;
    }

    if (seen.has(input as object)) {
      return undefined;
    }

    seen.add(input as object);

    if (Array.isArray(input)) {
      return input.map((item) => stringify(item));
    }

    const entries = Object.entries(input as Record<string, unknown>).sort(
      ([a], [b]) => {
        if (a < b) {
          return -1;
        }
        if (a > b) {
          return 1;
        }
        return 0;
      },
    );

    return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = stringify(val);
      return acc;
    }, {});
  };

  return JSON.stringify(stringify(value));
};
