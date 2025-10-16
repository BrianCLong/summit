export function withinErrorBound(
  observed: number,
  expectedVar: number,
  z = 1.96,
) {
  const bound = Math.sqrt(expectedVar) * z;
  return { ok: Math.abs(observed) <= bound, bound };
}
