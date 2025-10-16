const seen = new Map<string, number>();
export function track(querySig: string) {
  const n = (seen.get(querySig) || 0) + 1;
  seen.set(querySig, n);
  if (n > 50) console.warn('N+1 suspected for', querySig);
}
