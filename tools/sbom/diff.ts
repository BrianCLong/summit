export function diff(prev: any, cur: any) {
  const p = new Set(prev.packages.map((x: any) => x.purl));
  return cur.packages.filter((x: any) => !p.has(x.purl));
}
