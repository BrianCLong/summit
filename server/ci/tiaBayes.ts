export function failProb(features: number[], w: number[], bias = -2.0) {
  const z = features.reduce((s, x, i) => s + w[i] * x, bias);
  return 1 / (1 + Math.exp(-z));
}
export function pickTests(
  tests: { id: string; f: number[] }[],
  w: number[],
  targetRisk = 0.02,
) {
  let cumRisk = 0;
  const out = [] as string[];
  const scored = tests
    .map((t) => ({ id: t.id, p: failProb(t.f, w) }))
    .sort((a, b) => b.p - a.p);
  for (const t of scored) {
    out.push(t.id);
    cumRisk += t.p * (1 - cumRisk);
    if (cumRisk >= targetRisk) break;
  }
  return out;
}
