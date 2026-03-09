// factmarkets/lib/stable_json.ts
export function stableStringify(x: any): string {
  const norm = (v: any): any =>
    // eslint-disable-next-line no-nested-ternary
    Array.isArray(v)
      ? v.map(norm)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, norm(v[k])])
          )
        : v;
  return `${JSON.stringify(norm(x), null, 2)}\n`;
}
