export type FuzzConfig = {
  seed: number;
  iterations: number;
  maxIterations: number;
};

const DEFAULT_SEED = 7331;
const DEFAULT_ITERATIONS = 80;
const DEFAULT_MAX_ITERATIONS = 300;

export function getFuzzConfig(): FuzzConfig {
  const seed = parseInt(
    process.env.GRAPH_GUARDRAIL_FUZZ_SEED ?? `${DEFAULT_SEED}`,
    10,
  );
  const requestedIterations = parseInt(
    process.env.GRAPH_GUARDRAIL_FUZZ_ITERATIONS ?? `${DEFAULT_ITERATIONS}`,
    10,
  );
  const requestedMaxIterations = parseInt(
    process.env.GRAPH_GUARDRAIL_FUZZ_MAX_ITERATIONS ?? `${DEFAULT_MAX_ITERATIONS}`,
    10,
  );

  const maxIterations = Number.isFinite(requestedMaxIterations)
    ? Math.max(requestedMaxIterations, 1)
    : DEFAULT_MAX_ITERATIONS;

  const iterations = Math.min(
    Math.max(Number.isFinite(requestedIterations) ? requestedIterations : DEFAULT_ITERATIONS, 1),
    maxIterations,
  );

  return { seed, iterations, maxIterations };
}

export function logFuzzRun(config: FuzzConfig, corpusSize: number): void {
  const payload = {
    seed: config.seed,
    iterations: config.iterations,
    maxIterations: config.maxIterations,
    corpusSize,
  };

  // eslint-disable-next-line no-console
  console.info(`[graph-guardrail-fuzz] ${JSON.stringify(payload)}`);
}
