import { Counter, Gauge, Histogram, Registry } from "prom-client";

/**
 * Cache metrics for observability.
 * All metrics use consistent labels for namespace and tier.
 */
export class CacheMetrics {
  private readonly hits: Counter;
  private readonly misses: Counter;
  private readonly sets: Counter;
  private readonly deletes: Counter;
  private readonly invalidations: Counter;
  private readonly entriesGauge: Gauge;
  private readonly bytesGauge: Gauge;
  private readonly operationDuration: Histogram;

  constructor(
    private readonly namespace: string,
    registry?: Registry
  ) {
    const labels = { namespace: this.namespace };

    this.hits = new Counter({
      name: "cache_hits_total",
      help: "Total number of cache hits",
      labelNames: ["namespace", "tier"] as const,
      registers: registry ? [registry] : undefined,
    });

    this.misses = new Counter({
      name: "cache_misses_total",
      help: "Total number of cache misses",
      labelNames: ["namespace", "tier"] as const,
      registers: registry ? [registry] : undefined,
    });

    this.sets = new Counter({
      name: "cache_sets_total",
      help: "Total number of cache set operations",
      labelNames: ["namespace", "tier"] as const,
      registers: registry ? [registry] : undefined,
    });

    this.deletes = new Counter({
      name: "cache_deletes_total",
      help: "Total number of cache delete operations",
      labelNames: ["namespace", "tier"] as const,
      registers: registry ? [registry] : undefined,
    });

    this.invalidations = new Counter({
      name: "cache_invalidations_total",
      help: "Total number of cache invalidations",
      labelNames: ["namespace", "type"] as const,
      registers: registry ? [registry] : undefined,
    });

    this.entriesGauge = new Gauge({
      name: "cache_entries_count",
      help: "Current number of cache entries",
      labelNames: ["namespace", "tier"] as const,
      registers: registry ? [registry] : undefined,
    });

    this.bytesGauge = new Gauge({
      name: "cache_bytes_used",
      help: "Current bytes used by cache",
      labelNames: ["namespace", "tier"] as const,
      registers: registry ? [registry] : undefined,
    });

    this.operationDuration = new Histogram({
      name: "cache_operation_duration_seconds",
      help: "Duration of cache operations in seconds",
      labelNames: ["namespace", "tier", "operation"] as const,
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
      registers: registry ? [registry] : undefined,
    });
  }

  /**
   * Record a cache hit
   */
  recordHit(tier: "l1" | "l2"): void {
    this.hits.labels(this.namespace, tier).inc();
  }

  /**
   * Record a cache miss
   */
  recordMiss(tier: "l1" | "l2"): void {
    this.misses.labels(this.namespace, tier).inc();
  }

  /**
   * Record a cache set
   */
  recordSet(tier: "l1" | "l2"): void {
    this.sets.labels(this.namespace, tier).inc();
  }

  /**
   * Record a cache delete
   */
  recordDelete(tier: "l1" | "l2"): void {
    this.deletes.labels(this.namespace, tier).inc();
  }

  /**
   * Record an invalidation
   */
  recordInvalidation(type: "key" | "tag" | "pattern"): void {
    this.invalidations.labels(this.namespace, type).inc();
  }

  /**
   * Update the entries gauge
   */
  setEntries(tier: "l1" | "l2", count: number): void {
    this.entriesGauge.labels(this.namespace, tier).set(count);
  }

  /**
   * Update the bytes gauge
   */
  setBytes(tier: "l1" | "l2", bytes: number): void {
    this.bytesGauge.labels(this.namespace, tier).set(bytes);
  }

  /**
   * Time an operation
   */
  timeOperation(tier: "l1" | "l2", operation: "get" | "set" | "delete"): () => void {
    const end = this.operationDuration.startTimer({
      namespace: this.namespace,
      tier,
      operation,
    });
    return end;
  }

  /**
   * Get current stats from metrics
   */
  getStats(): {
    l1: { hits: number; misses: number; sets: number; deletes: number };
    l2: { hits: number; misses: number; sets: number; deletes: number };
  } {
    return {
      l1: {
        hits: (this.hits.labels(this.namespace, "l1") as any).hashMap?.[""]?.value ?? 0,
        misses: (this.misses.labels(this.namespace, "l1") as any).hashMap?.[""]?.value ?? 0,
        sets: (this.sets.labels(this.namespace, "l1") as any).hashMap?.[""]?.value ?? 0,
        deletes: (this.deletes.labels(this.namespace, "l1") as any).hashMap?.[""]?.value ?? 0,
      },
      l2: {
        hits: (this.hits.labels(this.namespace, "l2") as any).hashMap?.[""]?.value ?? 0,
        misses: (this.misses.labels(this.namespace, "l2") as any).hashMap?.[""]?.value ?? 0,
        sets: (this.sets.labels(this.namespace, "l2") as any).hashMap?.[""]?.value ?? 0,
        deletes: (this.deletes.labels(this.namespace, "l2") as any).hashMap?.[""]?.value ?? 0,
      },
    };
  }
}

/**
 * No-op metrics implementation for when metrics are disabled
 */
export class NoOpMetrics {
  recordHit(_tier: "l1" | "l2"): void {}
  recordMiss(_tier: "l1" | "l2"): void {}
  recordSet(_tier: "l1" | "l2"): void {}
  recordDelete(_tier: "l1" | "l2"): void {}
  recordInvalidation(_type: "key" | "tag" | "pattern"): void {}
  setEntries(_tier: "l1" | "l2", _count: number): void {}
  setBytes(_tier: "l1" | "l2", _bytes: number): void {}
  timeOperation(_tier: "l1" | "l2", _operation: "get" | "set" | "delete"): () => void {
    return () => {};
  }
  getStats() {
    return {
      l1: { hits: 0, misses: 0, sets: 0, deletes: 0 },
      l2: { hits: 0, misses: 0, sets: 0, deletes: 0 },
    };
  }
}
