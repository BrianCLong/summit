export type DpConfig = {
  epsilon: number;
  delta?: number;
  sensitivity: number;
  mechanism: 'laplace' | 'gaussian';
};

function randomNormal(mu = 0, sigma = 1) {
  // Box-Muller
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return (
    mu + sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  );
}

export function dpNoise(cfg: DpConfig) {
  if (cfg.mechanism === 'laplace') {
    const b = cfg.sensitivity / cfg.epsilon;
    return (Math.random() - 0.5) * 2 * b;
  }
  const sigma =
    Math.sqrt(2 * Math.log(1.25 / (cfg.delta || 1e-6))) *
    (cfg.sensitivity / cfg.epsilon);
  return randomNormal(0, sigma);
}

export function applyDp(count: number, cfg: DpConfig) {
  return count + dpNoise(cfg);
}
