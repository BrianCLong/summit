export function laplaceNoise(scale: number): number {
  const u = Math.random() - 0.5;
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

export function gaussianNoise(std: number): number {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}

export type DPMeta = {
  epsilon: number;
  delta: number;
  kMin: number;
  mechanism: "laplace" | "gaussian";
  clip?: number;
  noisy?: boolean;
  scale?: number;
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(p * (sorted.length - 1));
  return sorted[idx];
}

export function dpCount(rawCount: number, meta: DPMeta) {
  if (rawCount < meta.kMin) throw new Error("k_anonymity_violated");
  const scale = 1 / meta.epsilon;
  return {
    value: rawCount + laplaceNoise(scale),
    meta: { ...meta, scale, noisy: true },
  };
}

export function dpSum(rawValues: number[], meta: DPMeta) {
  const clip =
    meta.clip ?? Math.max(1, percentile(rawValues, 0.95) || 0);
  const clipped = rawValues.map((v) => Math.max(Math.min(v, clip), -clip));
  const sensitivity = clip;
  const scale = sensitivity / meta.epsilon;
  const noisy = clipped.reduce((a, b) => a + b, 0) + laplaceNoise(scale);
  return { value: noisy, meta: { ...meta, clip, scale, noisy: true } };
}
