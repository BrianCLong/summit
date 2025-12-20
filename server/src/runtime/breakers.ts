import CircuitBreaker from 'opossum';

/**
 * Wraps an asynchronous function with a circuit breaker.
 *
 * @template TArgs - The types of the arguments to the function.
 * @template TRes - The return type of the function.
 * @param fn - The asynchronous function to wrap.
 * @param name - A name for the circuit breaker, used for logging.
 * @param opts - Configuration options for the circuit breaker (timeout, error thresholds, etc.).
 * @returns The configured CircuitBreaker instance.
 */
export function breaker<TArgs extends any[], TRes>(
  fn: (...args: TArgs) => Promise<TRes>,
  name: string,
  opts: Partial<{
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    rollingCountTimeout?: number;
    rollingCountBuckets?: number;
  }> = {},
) {
  const br = new CircuitBreaker(fn, {
    timeout: 3000, // fail fast
    errorThresholdPercentage: 50, // trip after 50% errors in window
    resetTimeout: 10_000, // half-open after 10s
    rollingCountTimeout: 10_000,
    rollingCountBuckets: 10,
    ...opts,
  });

  br.on('open', () => console.warn(`[BREAKER:${name}] OPEN - circuit tripped`));
  br.on('halfOpen', () =>
    console.warn(`[BREAKER:${name}] HALF-OPEN - testing recovery`),
  );
  br.on('close', () =>
    console.log(`[BREAKER:${name}] CLOSED - circuit healthy`),
  );

  // Fallback strategy
  br.fallback(() => {
    throw new Error(`Service unavailable: ${name} circuit open`);
  });

  return br;
}
