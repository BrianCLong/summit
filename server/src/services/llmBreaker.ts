import CircuitBreaker from 'opossum';
export function wrapStream<TArgs extends any[]>(
  fn: (...args: TArgs) => AsyncGenerator<string>,
): (...args: TArgs) => AsyncGenerator<string> {
  const breaker = new CircuitBreaker(
    async (...args: TArgs) => {
      const results: string[] = [];
      for await (const t of fn(...args)) {
        results.push(t);
      }
      return results;
    },
    {
      errorThresholdPercentage: 50,
      resetTimeout: 5000,
      rollingCountTimeout: 10000,
    },
  );

  return async function* (...args: TArgs) {
    const results = (await breaker.fire(...args)) as string[];
    for (const t of results) yield t;
  };
}
