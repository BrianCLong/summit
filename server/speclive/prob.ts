export function sustainedBreach(p: number, n: number, alpha = 0.01) {
  // one-sided binomial test: H0 breach<=p
  const z = (n * p - 0) / Math.sqrt(n * p * (1 - p));
  return z > 2.33; // ~alpha=0.01
}
