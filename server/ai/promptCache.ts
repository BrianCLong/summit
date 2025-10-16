const H = new Map<string, string>();
export function key(t: string) {
  return t.replace(/\s+/g, ' ').trim().toLowerCase();
}
export function getOrSet(k: string, v: string) {
  const kk = key(k);
  if (H.has(kk)) return H.get(kk)!;
  H.set(kk, v);
  return v;
}
