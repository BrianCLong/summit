export function stableStringify(obj: any): string {
  const keys = (x: any): any =>
    Array.isArray(x) ? x.map(keys) :
    x && typeof x === "object"
      ? Object.fromEntries(Object.keys(x).sort().map(k => [k, keys(x[k])]))
      : x;
  return JSON.stringify(keys(obj), null, 2) + "\n";
}
