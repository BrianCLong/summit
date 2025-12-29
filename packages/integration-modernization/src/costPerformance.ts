export type CostSample = {
  connectorId: string;
  computeMs: number;
  apiCalls: number;
  storageBytes: number;
  egressBytes: number;
};

export class CostPerformanceTracker {
  private cache: Map<string, { value: unknown; expiresAt: number }> = new Map();
  private costs: Map<string, CostSample[]> = new Map();

  recordSample(sample: CostSample) {
    const existing = this.costs.get(sample.connectorId) ?? [];
    this.costs.set(sample.connectorId, [...existing, sample]);
  }

  summary(connectorId: string) {
    const samples = this.costs.get(connectorId) ?? [];
    const aggregate = samples.reduce(
      (acc, sample) => {
        acc.computeMs += sample.computeMs;
        acc.apiCalls += sample.apiCalls;
        acc.storageBytes += sample.storageBytes;
        acc.egressBytes += sample.egressBytes;
        return acc;
      },
      { computeMs: 0, apiCalls: 0, storageBytes: 0, egressBytes: 0 }
    );
    return { ...aggregate, samples: samples.length };
  }

  cacheResponse(connectorId: string, key: string, value: unknown, ttlMs: number) {
    this.cache.set(`${connectorId}:${key}`, { value, expiresAt: Date.now() + ttlMs });
  }

  getCached(connectorId: string, key: string) {
    const entry = this.cache.get(`${connectorId}:${key}`);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(`${connectorId}:${key}`);
      return undefined;
    }
    return entry.value;
  }
}
