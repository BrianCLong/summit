import CircuitBreaker from 'opossum';

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
