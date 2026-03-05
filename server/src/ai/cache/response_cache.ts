export class ResponseCache {
  private cache = new Map<string, { result: string, timestamp: number }>();

  // Example TTL: 60s
  set(queryHash: string, result: string, ttl: number = 60000) {
    this.cache.set(queryHash, { result, timestamp: Date.now() + ttl });
  }

  get(queryHash: string): string | null {
    const entry = this.cache.get(queryHash);
    if (!entry) return null;
    if (Date.now() > entry.timestamp) {
      this.cache.delete(queryHash);
      return null;
    }
    return entry.result;
  }
}
