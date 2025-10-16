export type DegradedOptions = {
  dropRate?: number; // 0..1 probability to drop
  minLatencyMs?: number; // base latency
  jitterMs?: number; // added random jitter
};

export function withDegraded<TArgs extends any[], TRes>(
  fn: (...args: TArgs) => Promise<TRes> | TRes,
  opts: DegradedOptions = {},
) {
  const drop = Math.max(0, Math.min(opts.dropRate ?? 0, 1));
  const base = Math.max(0, opts.minLatencyMs ?? 0);
  const jitter = Math.max(0, opts.jitterMs ?? 0);
  return async (...args: TArgs): Promise<TRes> => {
    const latency = base + Math.floor(Math.random() * jitter);
    await new Promise((r) => setTimeout(r, latency));
    if (Math.random() < drop) {
      throw Object.assign(new Error('Simulated packet drop'), {
        code: 'DEGRADED_DROP',
      });
    }
    return await fn(...args);
  };
}
