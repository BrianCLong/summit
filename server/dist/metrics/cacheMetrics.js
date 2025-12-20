import { Counter, Gauge } from 'prom-client';
import { registry } from './registry.js';
export const cacheHits = new Counter({
    name: 'cache_hits_total',
    help: 'Total cache hits',
    labelNames: ['store', 'op', 'tenant'],
    registers: [registry],
});
export const cacheMisses = new Counter({
    name: 'cache_misses_total',
    help: 'Total cache misses',
    labelNames: ['store', 'op', 'tenant'],
    registers: [registry],
});
export const cacheSets = new Counter({
    name: 'cache_sets_total',
    help: 'Total cache writes',
    labelNames: ['store', 'op', 'tenant'],
    registers: [registry],
});
export const cacheInvalidations = new Counter({
    name: 'cache_invalidations_total',
    help: 'Cache invalidations executed',
    labelNames: ['pattern', 'tenant'],
    registers: [registry],
});
export const cacheLocalSize = new Gauge({
    name: 'cache_local_entries',
    help: 'Entries in in-memory fallback cache',
    labelNames: ['namespace'],
    registers: [registry],
});
export function recHit(store, op, tenant) {
    cacheHits.labels(store, op, tenant ?? 'unknown').inc();
}
export function recMiss(store, op, tenant) {
    cacheMisses.labels(store, op, tenant ?? 'unknown').inc();
}
export function recSet(store, op, tenant) {
    cacheSets.labels(store, op, tenant ?? 'unknown').inc();
}
export function recInvalidation(pattern, tenant) {
    cacheInvalidations.labels(pattern, tenant ?? 'unknown').inc();
}
//# sourceMappingURL=cacheMetrics.js.map