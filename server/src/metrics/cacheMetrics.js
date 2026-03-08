"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheHitRatio = exports.cacheBypassTotal = exports.cacheEvictions = exports.cacheLocalSize = exports.cacheLatencySeconds = exports.cacheInvalidations = exports.cacheSets = exports.cacheMisses = exports.cacheHits = void 0;
exports.recHit = recHit;
exports.recMiss = recMiss;
exports.recSet = recSet;
exports.recInvalidation = recInvalidation;
exports.recEviction = recEviction;
exports.setHitRatio = setHitRatio;
const prom_client_1 = require("prom-client");
const registry_js_1 = require("./registry.js");
exports.cacheHits = new prom_client_1.Counter({
    name: 'cache_hits_total',
    help: 'Total cache hits',
    labelNames: ['store', 'op', 'tenant'],
    registers: [registry_js_1.registry],
});
exports.cacheMisses = new prom_client_1.Counter({
    name: 'cache_misses_total',
    help: 'Total cache misses',
    labelNames: ['store', 'op', 'tenant'],
    registers: [registry_js_1.registry],
});
exports.cacheSets = new prom_client_1.Counter({
    name: 'cache_sets_total',
    help: 'Total cache writes',
    labelNames: ['store', 'op', 'tenant'],
    registers: [registry_js_1.registry],
});
exports.cacheInvalidations = new prom_client_1.Counter({
    name: 'cache_invalidations_total',
    help: 'Cache invalidations executed',
    labelNames: ['pattern', 'tenant'],
    registers: [registry_js_1.registry],
});
exports.cacheLatencySeconds = new prom_client_1.Histogram({
    name: 'cache_latency_seconds',
    help: 'Latency of cache lookups in seconds',
    labelNames: ['op', 'result', 'tenant'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
    registers: [registry_js_1.registry],
});
exports.cacheLocalSize = new prom_client_1.Gauge({
    name: 'cache_local_entries',
    help: 'Entries in in-memory fallback cache',
    labelNames: ['namespace'],
    registers: [registry_js_1.registry],
});
exports.cacheEvictions = new prom_client_1.Counter({
    name: 'cache_evictions_total',
    help: 'Cache evictions',
    labelNames: ['store', 'reason'],
    registers: [registry_js_1.registry],
});
exports.cacheBypassTotal = new prom_client_1.Counter({
    name: 'cache_bypass_total',
    help: 'Cache bypass reasons',
    labelNames: ['op', 'reason', 'tenant'],
    registers: [registry_js_1.registry],
});
exports.cacheHitRatio = new prom_client_1.Gauge({
    name: 'cache_hit_ratio',
    help: 'Hit ratio for cache namespaces',
    labelNames: ['store', 'op'],
    registers: [registry_js_1.registry],
});
function recHit(store, op, tenant) {
    exports.cacheHits?.labels?.(store, op, tenant ?? 'unknown')?.inc?.();
}
function recMiss(store, op, tenant) {
    exports.cacheMisses?.labels?.(store, op, tenant ?? 'unknown')?.inc?.();
}
function recSet(store, op, tenant) {
    exports.cacheSets?.labels?.(store, op, tenant ?? 'unknown')?.inc?.();
}
function recInvalidation(pattern, tenant) {
    exports.cacheInvalidations?.labels?.(pattern, tenant ?? 'unknown')?.inc?.();
}
function recEviction(store, reason) {
    exports.cacheEvictions?.labels?.(store, reason)?.inc?.();
}
function setHitRatio(store, op, hits, misses) {
    const total = hits + misses;
    exports.cacheHitRatio?.labels?.(store, op)?.set?.(total === 0 ? 0 : hits / total);
}
