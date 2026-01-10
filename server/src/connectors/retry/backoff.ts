export interface BackoffOptions {
  /** Starting delay in milliseconds. */
  baseDelayMs?: number;
  /** Multiplier applied on each subsequent attempt. */
  factor?: number;
  /** Upper bound for any individual delay in milliseconds. */
  maxDelayMs?: number;
  /** Portion of the computed delay used for jitter (0-1). */
  jitterRatio?: number;
}

export interface BackoffPlanOptions extends BackoffOptions {
  /** Seed used to generate deterministic jitter. */
  seed?: string | number;
}

export interface BackoffState {
  attempt: number;
  delays: number[];
}

const DEFAULT_OPTIONS: Required<Omit<BackoffPlanOptions, 'seed'>> = {
  baseDelayMs: 200,
  factor: 2,
  maxDelayMs: 30_000,
  jitterRatio: 0.3,
};

/**
 * Minimal deterministic PRNG based on mulberry32.
 */
export function createSeededRng(seed: string | number = 'retry-seed') {
  let value = typeof seed === 'number' ? seed : hashSeed(seed);
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function applyJitter(
  delay: number,
  rng: () => number,
  jitterRatio: number,
  maxDelayMs: number,
) {
  if (jitterRatio <= 0) return delay;
  const jitterSpan = delay * jitterRatio;
  const jitter = (rng() - 0.5) * 2 * jitterSpan;
  const jittered = delay + jitter;
  return Math.max(0, Math.min(maxDelayMs, Math.round(jittered)));
}

function computeDelay(attempt: number, options: Required<BackoffOptions>) {
  const exponential = options.baseDelayMs * options.factor ** (attempt - 1);
  return Math.min(options.maxDelayMs, exponential);
}

export function createDeterministicBackoff(
  plan: BackoffPlanOptions = {},
): () => BackoffState {
  const { seed, ...rest } = plan;
  const mergedOptions: Required<BackoffOptions> = {
    ...DEFAULT_OPTIONS,
    ...rest,
  };
  const rng = createSeededRng(seed ?? 'retry-seed');
  let attempt = 0;
  const delays: number[] = [];

  return () => {
    attempt += 1;
    const baseDelay = computeDelay(attempt, mergedOptions);
    const delay = applyJitter(
      baseDelay,
      rng,
      mergedOptions.jitterRatio,
      mergedOptions.maxDelayMs,
    );
    delays.push(delay);
    return { attempt, delays: [...delays] };
  };
}

export function previewDelays(
  attempts: number,
  plan: BackoffPlanOptions = {},
): number[] {
  const step = createDeterministicBackoff(plan);
  let state: BackoffState | undefined;
  for (let i = 0; i < attempts; i += 1) {
    state = step();
  }
  return state?.delays ?? [];
}
