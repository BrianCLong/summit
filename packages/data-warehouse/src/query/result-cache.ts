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

import { EventEmitter } from 'events';
import { CompressionManager, CompressionType } from '../storage/compression-manager';

export interface CacheEntry {
  queryId: string;
  queryHash: string;
  result: any[];
  metadata: {
    rowCount: number;
    columns: string[];
    executionTimeMs: number;
    createdAt: Date;
    lastAccessedAt: Date;
    accessCount: number;
    compressed: boolean;
    compressedSize?: number;
    uncompressedSize?: number;
  };
  ttl?: number; // milliseconds
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  hits: number;
  misses: number;
  evictions: number;
  compressionRatio: number;
}

export class ResultCache extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // For LRU
  private compressionManager: CompressionManager;
  private maxSize: number;
  private compressionThreshold: number = 1024 * 1024; // 1MB
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(
    maxSizeBytes: number = 1024 * 1024 * 1024, // 1GB default
  ) {
    super();
    this.maxSize = maxSizeBytes;
    this.compressionManager = new CompressionManager();
  }

  /**
   * Get cached result
   */
  async get(queryHash: string): Promise<any[] | null> {
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
  async set(
    queryHash: string,
    queryId: string,
    result: any[],
    metadata: {
      columns: string[];
      executionTimeMs: number;
    },
    ttl?: number,
  ): Promise<void> {
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

    const entry: CacheEntry = {
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
  delete(queryHash: string): boolean {
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
  invalidate(tableName: string): number {
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
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];

    this.emit('cache:cleared', { count });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => {
      return sum + (entry.metadata.compressedSize || entry.metadata.uncompressedSize);
    }, 0);

    const totalUncompressed = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.metadata.uncompressedSize,
      0,
    );

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      compressionRatio:
        totalSize > 0 ? totalUncompressed / totalSize : 1,
    };
  }

  /**
   * Get top cached queries
   */
  getTopQueries(limit: number = 10): Array<{
    queryHash: string;
    queryId: string;
    accessCount: number;
    hitRate: number;
  }> {
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
  async warmCache(
    queries: Array<{
      queryHash: string;
      queryId: string;
      result: any[];
      metadata: any;
    }>,
  ): Promise<void> {
    for (const query of queries) {
      await this.set(
        query.queryHash,
        query.queryId,
        query.result,
        query.metadata,
      );
    }

    this.emit('cache:warmed', { count: queries.length });
  }

  // Private methods

  private async compressResult(result: any[]): Promise<{
    data: any;
    size: number;
  }> {
    const serialized = JSON.stringify(result);
    const compressed = await this.compressionManager.compress(
      Buffer.from(serialized),
      CompressionType.ZSTD,
    );

    return {
      data: compressed,
      size: compressed.length,
    };
  }

  private async decompressResult(entry: CacheEntry): Promise<any[]> {
    const decompressed = await this.compressionManager.decompress(
      entry.result,
      CompressionType.ZSTD,
    );

    return JSON.parse(decompressed.toString());
  }

  private estimateSize(result: any[]): number {
    // Rough estimation
    return JSON.stringify(result).length;
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;

    const age = Date.now() - entry.metadata.createdAt.getTime();
    return age > entry.ttl;
  }

  private updateAccessOrder(queryHash: string): void {
    const index = this.accessOrder.indexOf(queryHash);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(queryHash);
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    const currentSize = Array.from(this.cache.values()).reduce((sum, entry) => {
      return sum + (entry.metadata.compressedSize || entry.metadata.uncompressedSize);
    }, 0);

    if (currentSize + requiredSize <= this.maxSize) {
      return;
    }

    // Evict LRU entries until we have space
    while (
      this.cache.size > 0 &&
      currentSize + requiredSize > this.maxSize
    ) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
        this.stats.evictions++;
        this.emit('cache:evicted', { queryHash: lruKey });
      }
    }
  }
}
