import { Counter, Gauge, Histogram } from 'prom-client';
import { registry } from './registry.js';

export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['store', 'op', 'tenant'] as const,
  registers: [registry],
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['store', 'op', 'tenant'] as const,
  registers: [registry],
});

export const cacheSets = new Counter({
  name: 'cache_sets_total',
  help: 'Total cache writes',
  labelNames: ['store', 'op', 'tenant'] as const,
  registers: [registry],
});

export const cacheInvalidations = new Counter({
  name: 'cache_invalidations_total',
  help: 'Cache invalidations executed',
  labelNames: ['pattern', 'tenant'] as const,
  registers: [registry],
});

export const cacheLatencySeconds = new Histogram({
  name: 'cache_latency_seconds',
  help: 'Latency of cache lookups in seconds',
  labelNames: ['op', 'result', 'tenant'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [registry],
});

export const cacheLocalSize = new Gauge({
  name: 'cache_local_entries',
  help: 'Entries in in-memory fallback cache',
  labelNames: ['namespace'] as const,
  registers: [registry],
});

export const cacheEvictions = new Counter({
  name: 'cache_evictions_total',
  help: 'Cache evictions',
  labelNames: ['store', 'reason'] as const,
  registers: [registry],
});

export const cacheBypassTotal = new Counter({
  name: 'cache_bypass_total',
  help: 'Cache bypass reasons',
  labelNames: ['op', 'reason', 'tenant'] as const,
  registers: [registry],
});

export const cacheHitRatio = new Gauge({
  name: 'cache_hit_ratio',
  help: 'Hit ratio for cache namespaces',
  labelNames: ['store', 'op'] as const,
  registers: [registry],
});

export function recHit(store: string, op: string, tenant?: string) {
  cacheHits?.labels?.(store, op, tenant ?? 'unknown')?.inc?.();
}
export function recMiss(store: string, op: string, tenant?: string) {
  cacheMisses?.labels?.(store, op, tenant ?? 'unknown')?.inc?.();
}
export function recSet(store: string, op: string, tenant?: string) {
  cacheSets?.labels?.(store, op, tenant ?? 'unknown')?.inc?.();
}
export function recInvalidation(pattern: string, tenant?: string) {
  cacheInvalidations?.labels?.(pattern, tenant ?? 'unknown')?.inc?.();
}

export function recEviction(store: string, reason: string) {
  cacheEvictions?.labels?.(store, reason)?.inc?.();
}

export function setHitRatio(store: string, op: string, hits: number, misses: number) {
  const total = hits + misses;
  cacheHitRatio?.labels?.(store, op)?.set?.(total === 0 ? 0 : hits / total);
}
