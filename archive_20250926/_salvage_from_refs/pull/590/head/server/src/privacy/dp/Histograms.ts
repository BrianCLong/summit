export type Bucket = { key: string; count: number };

export function dpHistogram(raw: Record<string, number>, epsilon: number, kMin = 25) {
  const scale = 1 / epsilon;
  const noisy: Bucket[] = [];
  for (const [key, c] of Object.entries(raw)) {
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    const val = c + noise;
    if (c >= kMin) noisy.push({ key, count: val });
  }
  return { buckets: noisy, meta: { epsilon, kMin, scale } };
}

export function dpTopK(
  raw: Record<string, number>,
  k: number,
  epsilon: number,
  kMin = 25
) {
  const keys = Object.keys(raw).filter((k0) => raw[k0] >= kMin);
  const scores = keys.map((k0) => raw[k0]);
  const sens = 1;
  const lambda = epsilon / (2 * sens);
  const weights = scores.map((s) => Math.exp(lambda * s));
  const total = weights.reduce((a, b) => a + b, 0);
  const chosen = new Set<string>();
  while (chosen.size < Math.min(k, keys.length)) {
    let r = Math.random() * total;
    let acc = 0;
    for (let i = 0; i < keys.length; i++) {
      acc += weights[i];
      if (acc >= r) {
        chosen.add(keys[i]);
        break;
      }
    }
  }
  const out = Array.from(chosen).map((key) => ({ key, score: raw[key] }));
  return { items: out, meta: { epsilon, kMin, mechanism: "exponential" } };
}
