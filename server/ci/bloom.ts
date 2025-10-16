export function shouldRun(paths: string[], bloom: Uint8Array) {
  // hash each path → check bits; return false if all present (seen before & safe)
  const hit = paths.every((p) => has(bloom, hash(p)));
  return !hit; // if all seen, skip heavy analyzer
}
