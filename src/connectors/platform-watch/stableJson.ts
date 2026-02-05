export function stableStringify(value: unknown, indent = 2): string {
  return JSON.stringify(sortKeys(value), null, indent) + '\n';
}

function sortKeys(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
      }, {});
  }
  return value;
}
