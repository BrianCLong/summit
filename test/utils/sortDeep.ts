export function sortDeep<T>(v: T): T {
  if (Array.isArray(v))
    return v
      .map(sortDeep)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, val]) => [k, sortDeep(val)]),
    ) as T;
  }
  return v;
}
