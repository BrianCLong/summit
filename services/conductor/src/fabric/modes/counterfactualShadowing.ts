export interface FlakeObservation {
  test: string;
  failureRate: number;
  env: { seed?: number; parallelism?: number; clockSkewMs?: number };
}

export interface CounterfactualSeed {
  test: string;
  adjustments: { seed?: number; parallelism?: number; clockSkewMs?: number };
  predictedLift: number;
}

export interface ShadowingResult {
  seeds: CounterfactualSeed[];
  expectedReproRate: number;
}

export function buildCounterfactualShadow(
  observations: FlakeObservation[],
  budget: number,
): ShadowingResult {
  const sorted = observations
    .sort((a, b) => b.failureRate - a.failureRate)
    .slice(0, budget);
  const seeds: CounterfactualSeed[] = [];
  let combined = 0;
  for (const obs of sorted) {
    const seed = deriveSeed(obs);
    combined = 1 - (1 - combined) * (1 - seed.predictedLift);
    if (seed.predictedLift > 0.01) seeds.push(seed);
  }
  return { seeds, expectedReproRate: Number(combined.toFixed(3)) };
}

function deriveSeed(obs: FlakeObservation): CounterfactualSeed {
  const adjustments: CounterfactualSeed['adjustments'] = {};
  if (obs.env.seed !== undefined) adjustments.seed = obs.env.seed + 1337;
  if (obs.env.parallelism !== undefined)
    adjustments.parallelism = Math.max(1, obs.env.parallelism * 2);
  if (obs.env.clockSkewMs !== undefined)
    adjustments.clockSkewMs = (obs.env.clockSkewMs || 0) + 150;
  const predictedLift = Math.min(0.9, obs.failureRate * 1.5);
  return { test: obs.test, adjustments, predictedLift };
}
