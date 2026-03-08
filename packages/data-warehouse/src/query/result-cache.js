"use strict";
// @ts-nocheck
/**
 * Query Result Cache for Summit Data Warehouse
 *
 * Intelligent result caching with:
 * - Automatic cache invalidation
 * - TTL-based expiration
 * - LRU eviction
 * - Compression for large results
 * - Cache warming
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultCache = void 0;
const events_1 = require("events");
const compression_manager_1 = require("../storage/compression-manager");
class ResultCache extends events_1.EventEmitter {
    cache = new Map();
    accessOrder = []; // For LRU
    compressionManager;
    maxSize;
    compressionThreshold = 1024 * 1024; // 1MB
    stats = {
        hits: 0,
        misses: 0,
        evictions: 0,
    };
    constructor(maxSizeBytes = 1024 * 1024 * 1024) {
        super();
        this.maxSize = maxSizeBytes;
        this.compressionManager = new compression_manager_1.CompressionManager();
    }
    /**
     * Get cached result
     */
    async get(queryHash) {
        const entry = this.cache.get(queryHash);
        if (!entry) {
            this.stats.misses++;
            this.emit('cache:miss', { queryHash });
            return null;
        }
        // Check TTL
        if (entry.ttl && this.isExpired(entry)) {
            this.delete(queryHash);
            this.stats.misses++;
            return null;
        }
        // Update access tracking
        entry.metadata.lastAccessedAt = new Date();
        entry.metadata.accessCount++;
        this.updateAccessOrder(queryHash);
        this.stats.hits++;
        this.emit('cache:hit', { queryHash, accessCount: entry.metadata.accessCount });
        // Decompress if needed
        if (entry.metadata.compressed) {
            const decompressed = await this.decompressResult(entry);
            return decompressed;
        }
        return entry.result;
    }
    /**
     * Store result in cache
     */
    async set(queryHash, queryId, result, metadata, ttl) {
        const resultSize = this.estimateSize(result);
        // Compress large results
        let stored = result;
        let compressed = false;
        let compressedSize = resultSize;
        if (resultSize > this.compressionThreshold) {
            const compressionResult = await this.compressResult(result);
            stored = compressionResult.data;
            compressed = true;
            compressedSize = compressionResult.size;
        }
        const entry = {
            queryId,
            queryHash,
            result: stored,
            metadata: {
                rowCount: result.length,
                columns: metadata.columns,
                executionTimeMs: metadata.executionTimeMs,
                createdAt: new Date(),
                lastAccessedAt: new Date(),
                accessCount: 0,
                compressed,
                compressedSize: compressed ? compressedSize : undefined,
                uncompressedSize: resultSize,
            },
            ttl,
        };
        // Ensure we have space
        await this.ensureSpace(compressedSize);
        this.cache.set(queryHash, entry);
        this.updateAccessOrder(queryHash);
        this.emit('cache:set', {
            queryHash,
            size: compressedSize,
            compressed,
        });
    }
    /**
     * Delete entry from cache
     */
    delete(queryHash) {
        const deleted = this.cache.delete(queryHash);
        if (deleted) {
            const index = this.accessOrder.indexOf(queryHash);
            if (index !== -1) {
                this.accessOrder.splice(index, 1);
            }
            this.emit('cache:delete', { queryHash });
        }
        return deleted;
    }
    /**
     * Invalidate cache entries based on table changes
     */
    invalidate(tableName) {
        let invalidated = 0;
        for (const [hash, entry] of this.cache.entries()) {
            // Simple invalidation - check if query involves table
            if (entry.queryId.includes(tableName)) {
                this.delete(hash);
                invalidated++;
            }
        }
        this.emit('cache:invalidated', { tableName, count: invalidated });
        return invalidated;
    }
    /**
     * Clear all cache entries
     */
    clear() {
        const count = this.cache.size;
        this.cache.clear();
        this.accessOrder = [];
        this.emit('cache:cleared', { count });
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => {
            return sum + (entry.metadata.compressedSize || entry.metadata.uncompressedSize);
        }, 0);
        const totalUncompressed = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.metadata.uncompressedSize, 0);
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
        return {
            totalEntries: this.cache.size,
            totalSize,
            hitRate,
            hits: this.stats.hits,
            misses: this.stats.misses,
            evictions: this.stats.evictions,
            compressionRatio: totalSize > 0 ? totalUncompressed / totalSize : 1,
        };
    }
    /**
     * Get top cached queries
     */
    getTopQueries(limit = 10) {
        const entries = Array.from(this.cache.values())
            .sort((a, b) => b.metadata.accessCount - a.metadata.accessCount)
            .slice(0, limit);
        return entries.map((entry) => ({
            queryHash: entry.queryHash,
            queryId: entry.queryId,
            accessCount: entry.metadata.accessCount,
            hitRate: entry.metadata.accessCount / (entry.metadata.accessCount + 1),
        }));
    }
    /**
     * Warm cache with frequently used queries
     */
    async warmCache(queries) {
        for (const query of queries) {
            await this.set(query.queryHash, query.queryId, query.result, query.metadata);
        }
        this.emit('cache:warmed', { count: queries.length });
    }
    // Private methods
    async compressResult(result) {
        const serialized = JSON.stringify(result);
        const compressed = await this.compressionManager.compress(Buffer.from(serialized), compression_manager_1.CompressionType.ZSTD);
        return {
            data: compressed,
            size: compressed.length,
        };
    }
    async decompressResult(entry) {
        const decompressed = await this.compressionManager.decompress(entry.result, compression_manager_1.CompressionType.ZSTD);
        return JSON.parse(decompressed.toString());
    }
    estimateSize(result) {
        // Rough estimation
        return JSON.stringify(result).length;
    }
    isExpired(entry) {
        if (!entry.ttl) {
            return false;
        }
        const age = Date.now() - entry.metadata.createdAt.getTime();
        return age > entry.ttl;
    }
    updateAccessOrder(queryHash) {
        const index = this.accessOrder.indexOf(queryHash);
        if (index !== -1) {
            this.accessOrder.splice(index, 1);
        }
        this.accessOrder.push(queryHash);
    }
    async ensureSpace(requiredSize) {
        const currentSize = Array.from(this.cache.values()).reduce((sum, entry) => {
            return sum + (entry.metadata.compressedSize || entry.metadata.uncompressedSize);
        }, 0);
        if (currentSize + requiredSize <= this.maxSize) {
            return;
        }
        // Evict LRU entries until we have space
        while (this.cache.size > 0 &&
            currentSize + requiredSize > this.maxSize) {
            const lruKey = this.accessOrder.shift();
            if (lruKey) {
                this.cache.delete(lruKey);
                this.stats.evictions++;
                this.emit('cache:evicted', { queryHash: lruKey });
            }
        }
    }
}
exports.ResultCache = ResultCache;
