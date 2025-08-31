import { Counter, Gauge } from 'prom-client';
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

export const cacheLocalSize = new Gauge({
  name: 'cache_local_entries',
  help: 'Entries in in-memory fallback cache',
  labelNames: ['namespace'] as const,
  registers: [registry],
});

export function recHit(store: string, op: string, tenant?: string) {
  cacheHits.labels(store, op, tenant ?? 'unknown').inc();
}
export function recMiss(store: string, op: string, tenant?: string) {
  cacheMisses.labels(store, op, tenant ?? 'unknown').inc();
}
export function recSet(store: string, op: string, tenant?: string) {
  cacheSets.labels(store, op, tenant ?? 'unknown').inc();
}
export function recInvalidation(pattern: string, tenant?: string) {
  cacheInvalidations.labels(pattern, tenant ?? 'unknown').inc();
}
