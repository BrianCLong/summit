export function overlaps(aHashes: string[], bHashes: string[]): boolean {
  const set = new Set(aHashes);
  return bHashes.some((x) => set.has(x));
}
