import CircuitBreaker from 'opossum';

export function wrap<T extends (...args: any[]) => Promise<any>>(fn: T, name: string) {
  const breaker = new CircuitBreaker(fn, {
    timeout: 2000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000,
    rollingCountBuckets: 10,
    rollingCountTimeout: 10000
  });

  breaker.fallback((...args: any[]) => {
    return { error: 'degraded', data: null, fallback: true };
  });

  breaker.on('open', () => console.warn(`[cb] open ${name}`));

  return (...args: Parameters<T>): Promise<ReturnType<T>> => breaker.fire(...args);
}
