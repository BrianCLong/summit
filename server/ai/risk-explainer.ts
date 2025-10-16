export function contributions(weights: number[], x: number[]) {
  const base = 0,
    contrib = weights.map((w, i) => w * x[i]);
  const score = base + contrib.reduce((a, b) => a + b, 0);
  const top = contrib
    .map((v, i) => ({ i, v }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .slice(0, 5);
  return { score, top };
}
