"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoOpMetrics = exports.CacheMetrics = void 0;
const prom_client_1 = require("prom-client");
/**
 * Cache metrics for observability.
 * All metrics use consistent labels for namespace and tier.
 */
class CacheMetrics {
    namespace;
    hits;
    misses;
    sets;
    deletes;
    invalidations;
    entriesGauge;
    bytesGauge;
    operationDuration;
    constructor(namespace, registry) {
        this.namespace = namespace;
        const labels = { namespace: this.namespace };
        this.hits = new prom_client_1.Counter({
            name: 'cache_hits_total',
            help: 'Total number of cache hits',
            labelNames: ['namespace', 'tier'],
            registers: registry ? [registry] : undefined,
        });
        this.misses = new prom_client_1.Counter({
            name: 'cache_misses_total',
            help: 'Total number of cache misses',
            labelNames: ['namespace', 'tier'],
            registers: registry ? [registry] : undefined,
        });
        this.sets = new prom_client_1.Counter({
            name: 'cache_sets_total',
            help: 'Total number of cache set operations',
            labelNames: ['namespace', 'tier'],
            registers: registry ? [registry] : undefined,
        });
        this.deletes = new prom_client_1.Counter({
            name: 'cache_deletes_total',
            help: 'Total number of cache delete operations',
            labelNames: ['namespace', 'tier'],
            registers: registry ? [registry] : undefined,
        });
        this.invalidations = new prom_client_1.Counter({
            name: 'cache_invalidations_total',
            help: 'Total number of cache invalidations',
            labelNames: ['namespace', 'type'],
            registers: registry ? [registry] : undefined,
        });
        this.entriesGauge = new prom_client_1.Gauge({
            name: 'cache_entries_count',
            help: 'Current number of cache entries',
            labelNames: ['namespace', 'tier'],
            registers: registry ? [registry] : undefined,
        });
        this.bytesGauge = new prom_client_1.Gauge({
            name: 'cache_bytes_used',
            help: 'Current bytes used by cache',
            labelNames: ['namespace', 'tier'],
            registers: registry ? [registry] : undefined,
        });
        this.operationDuration = new prom_client_1.Histogram({
            name: 'cache_operation_duration_seconds',
            help: 'Duration of cache operations in seconds',
            labelNames: ['namespace', 'tier', 'operation'],
            buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
            registers: registry ? [registry] : undefined,
        });
    }
    /**
     * Record a cache hit
     */
    recordHit(tier) {
        this.hits.labels(this.namespace, tier).inc();
    }
    /**
     * Record a cache miss
     */
    recordMiss(tier) {
        this.misses.labels(this.namespace, tier).inc();
    }
    /**
     * Record a cache set
     */
    recordSet(tier) {
        this.sets.labels(this.namespace, tier).inc();
    }
    /**
     * Record a cache delete
     */
    recordDelete(tier) {
        this.deletes.labels(this.namespace, tier).inc();
    }
    /**
     * Record an invalidation
     */
    recordInvalidation(type) {
        this.invalidations.labels(this.namespace, type).inc();
    }
    /**
     * Update the entries gauge
     */
    setEntries(tier, count) {
        this.entriesGauge.labels(this.namespace, tier).set(count);
    }
    /**
     * Update the bytes gauge
     */
    setBytes(tier, bytes) {
        this.bytesGauge.labels(this.namespace, tier).set(bytes);
    }
    /**
     * Time an operation
     */
    timeOperation(tier, operation) {
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
    getStats() {
        return {
            l1: {
                hits: this.hits.labels(this.namespace, 'l1').hashMap?.['']?.value ?? 0,
                misses: this.misses.labels(this.namespace, 'l1').hashMap?.['']?.value ?? 0,
                sets: this.sets.labels(this.namespace, 'l1').hashMap?.['']?.value ?? 0,
                deletes: this.deletes.labels(this.namespace, 'l1').hashMap?.['']?.value ?? 0,
            },
            l2: {
                hits: this.hits.labels(this.namespace, 'l2').hashMap?.['']?.value ?? 0,
                misses: this.misses.labels(this.namespace, 'l2').hashMap?.['']?.value ?? 0,
                sets: this.sets.labels(this.namespace, 'l2').hashMap?.['']?.value ?? 0,
                deletes: this.deletes.labels(this.namespace, 'l2').hashMap?.['']?.value ?? 0,
            },
        };
    }
}
exports.CacheMetrics = CacheMetrics;
/**
 * No-op metrics implementation for when metrics are disabled
 */
class NoOpMetrics {
    recordHit(_tier) { }
    recordMiss(_tier) { }
    recordSet(_tier) { }
    recordDelete(_tier) { }
    recordInvalidation(_type) { }
    setEntries(_tier, _count) { }
    setBytes(_tier, _bytes) { }
    timeOperation(_tier, _operation) {
        return () => { };
    }
    getStats() {
        return {
            l1: { hits: 0, misses: 0, sets: 0, deletes: 0 },
            l2: { hits: 0, misses: 0, sets: 0, deletes: 0 },
        };
    }
}
exports.NoOpMetrics = NoOpMetrics;
