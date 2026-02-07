// factmarkets/lib/stable_json.ts
export function stableStringify(x: any): string {
  const norm = (v: any): any => {
    if (Array.isArray(v)) {
      return v.map(norm);
    }
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, norm(v[k])]),
      );
    }
    return v;
  };
  return `${JSON.stringify(norm(x), null, 2)}\n`;
}
