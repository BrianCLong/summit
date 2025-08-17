/**
 * Neighborhood Cache Service
 * 
 * Redis-backed cache for graph neighborhoods to improve performance
 * of frequent graph traversal queries.
 * Redis Neighborhood Cache Service
 * Provides intelligent caching for graph neighborhoods and related data
 */

import Redis from 'ioredis';
import pino from 'pino';
import { getTenantCacheKey } from '../middleware/withTenant.js';

const logger = pino({ name: 'NeighborhoodCache' });

interface NeighborhoodData {
  entityId: string;
  neighbors: Array<{
    id: string;
    type: string;
    relationshipType: string;
    props: Record<string, any>;
  }>;
  cachedAt: number;
  hops: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalKeys: number;
}

export class NeighborhoodCache {
  private redis: Redis;
  private defaultTTL: number = 300; // 5 minutes
  private maxHops: number = 3;
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, totalKeys: 0 };

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      keyPrefix: 'neighborhoods:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    this.redis.on('error', (err) => {
      logger.error({ error: err }, 'Redis connection error');
    });
  }

  /**
   * Get neighborhood data for an entity
   */
  async getNeighborhood(
    tenantId: string,
    entityId: string,
    hops: number = 1
  ): Promise<NeighborhoodData | null> {
    try {
      const key = this.generateKey(tenantId, entityId, hops);
      const cached = await this.redis.get(key);
      
      if (cached) {
        this.stats.hits++;
        const data = JSON.parse(cached) as NeighborhoodData;
        
        logger.debug('Neighborhood cache hit', {
          entityId,
          tenantId,
          hops,
          age: Date.now() - data.cachedAt
        });
        
        return data;
      }
      
      this.stats.misses++;
      logger.debug('Neighborhood cache miss', { entityId, tenantId, hops });
      return null;
    } catch (error) {
      logger.error({ error, entityId, tenantId }, 'Error reading from neighborhood cache');
import { TenantContext, TenantValidator } from '../middleware/tenantValidator.js';

const logger = pino({ name: 'neighborhoodCache' });

export interface NeighborhoodData {
  nodeId: string;
  nodeType: string;
  properties: Record<string, any>;
  relationships: Array<{
    id: string;
    type: string;
    startNode: string;
    endNode: string;
    properties: Record<string, any>;
  }>;
  neighbors: Array<{
    id: string;
    type: string;
    properties: Record<string, any>;
    distance: number;
  }>;
  metadata: {
    depth: number;
    totalNodes: number;
    totalRelationships: number;
    lastUpdated: string;
    ttl: number;
  };
}

export interface CacheOptions {
  ttl?: number;
  maxDepth?: number;
  maxNeighbors?: number;
  includeProperties?: boolean;
  compressionEnabled?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  hitRate: number;
  memoryUsage: number;
}

/**
 * Intelligent neighborhood caching with Redis
 */
export class NeighborhoodCache {
  private redis: Redis;
  private stats: CacheStats;
  private readonly keyPrefix = 'nbhd';
  private readonly indexPrefix = 'idx';
  private readonly defaultTTL = 1800; // 30 minutes
  private readonly maxNeighborhoods = 10000;

  constructor(redis: Redis) {
    this.redis = redis;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      hitRate: 0,
      memoryUsage: 0
    };
    
    // Initialize cache monitoring
    this.initializeMonitoring();
  }

  /**
   * Get neighborhood data from cache
   */
  async getNeighborhood(
    nodeId: string,
    tenantContext: TenantContext,
    options: CacheOptions = {}
  ): Promise<NeighborhoodData | null> {
    const { maxDepth = 2, maxNeighbors = 100 } = options;
    
    const cacheKey = this.generateNeighborhoodKey(nodeId, tenantContext, maxDepth, maxNeighbors);
    
    try {
      const start = Date.now();
      const cached = await this.redis.get(cacheKey);
      const latency = Date.now() - start;
      
      if (cached) {
        this.stats.hits++;
        logger.debug(`Cache HIT for neighborhood ${nodeId} (tenant: ${tenantContext.tenantId}) - ${latency}ms`);
        
        const data = this.decompress(cached);
        
        // Check if data is still valid
        if (this.isDataValid(data)) {
          return data;
        } else {
          // Data expired, remove from cache
          await this.invalidateNeighborhood(nodeId, tenantContext);
        }
      }
      
      this.stats.misses++;
      logger.debug(`Cache MISS for neighborhood ${nodeId} (tenant: ${tenantContext.tenantId}) - ${latency}ms`);
      return null;
      
    } catch (error) {
      logger.error(`Failed to get neighborhood ${nodeId} from cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Store neighborhood data in cache
   */
  async setNeighborhood(
    tenantId: string,
    entityId: string,
    hops: number,
    neighbors: NeighborhoodData['neighbors'],
    ttl?: number
  ): Promise<void> {
    try {
      const key = this.generateKey(tenantId, entityId, hops);
      const data: NeighborhoodData = {
        entityId,
        neighbors,
        cachedAt: Date.now(),
        hops
      };

      await this.redis.setex(key, ttl || this.defaultTTL, JSON.stringify(data));
      this.stats.totalKeys++;
      
      logger.debug('Neighborhood cached', {
        entityId,
        tenantId,
        hops,
        neighborCount: neighbors.length,
        ttl: ttl || this.defaultTTL
      });
    } catch (error) {
      logger.error({ error, entityId, tenantId }, 'Error writing to neighborhood cache');
   * Cache neighborhood data
   */
  async setNeighborhood(
    nodeId: string,
    data: NeighborhoodData,
    tenantContext: TenantContext,
    options: CacheOptions = {}
  ): Promise<boolean> {
    const { ttl = this.defaultTTL, maxDepth = 2, maxNeighbors = 100, compressionEnabled = true } = options;
    
    const cacheKey = this.generateNeighborhoodKey(nodeId, tenantContext, maxDepth, maxNeighbors);
    
    try {
      const start = Date.now();
      
      // Enhance data with metadata
      const enhancedData: NeighborhoodData = {
        ...data,
        metadata: {
          ...data.metadata,
          lastUpdated: new Date().toISOString(),
          ttl: ttl
        }
      };
      
      // Compress data if enabled
      const serializedData = compressionEnabled ? 
        this.compress(enhancedData) : 
        JSON.stringify(enhancedData);
      
      // Set in cache with TTL
      await this.redis.setex(cacheKey, ttl, serializedData);
      
      // Update indexes for efficient invalidation
      await this.updateIndexes(nodeId, tenantContext, cacheKey);
      
      const latency = Date.now() - start;
      this.stats.sets++;
      
      logger.debug(`Cached neighborhood ${nodeId} (tenant: ${tenantContext.tenantId}) - ${latency}ms, ${serializedData.length} bytes`);
      
      // Cleanup old entries if needed
      await this.cleanupIfNeeded(tenantContext);
      
      return true;
      
    } catch (error) {
      logger.error(`Failed to cache neighborhood ${nodeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Invalidate neighborhood cache for an entity and its neighbors
   */
  async invalidateEntity(tenantId: string, entityId: string): Promise<void> {
    try {
      const pattern = getTenantCacheKey(tenantId, `*:${entityId}:*`);
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.evictions += keys.length;
        
        logger.debug('Invalidated neighborhood cache', {
          entityId,
          tenantId,
          keysRemoved: keys.length
        });
      }
    } catch (error) {
      logger.error({ error, entityId, tenantId }, 'Error invalidating neighborhood cache');
   * Invalidate specific neighborhood
   */
  async invalidateNeighborhood(
    nodeId: string,
    tenantContext: TenantContext
  ): Promise<number> {
    try {
      const pattern = this.generateNeighborhoodPattern(nodeId, tenantContext);
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        
        // Remove from indexes
        await this.removeFromIndexes(nodeId, tenantContext);
        
        this.stats.invalidations += deleted;
        logger.info(`Invalidated ${deleted} neighborhood cache entries for node ${nodeId} (tenant: ${tenantContext.tenantId})`);
        return deleted;
      }
      
      return 0;
      
    } catch (error) {
      logger.error(`Failed to invalidate neighborhood ${nodeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  /**
   * Invalidate cache for all neighbors of an entity
   */
  async invalidateNeighbors(tenantId: string, entityIds: string[]): Promise<void> {
    try {
      const patterns = entityIds.map(id => getTenantCacheKey(tenantId, `*:${id}:*`));
      const allKeys: string[] = [];
      
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        allKeys.push(...keys);
      }
      
      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
        this.stats.evictions += allKeys.length;
        
        logger.debug('Invalidated neighbor caches', {
          tenantId,
          entityCount: entityIds.length,
          keysRemoved: allKeys.length
        });
      }
    } catch (error) {
      logger.error({ error, tenantId }, 'Error invalidating neighbor caches');
   * Invalidate neighborhoods affected by relationship changes
   */
  async invalidateRelated(
    nodeIds: string[],
    tenantContext: TenantContext
  ): Promise<number> {
    let totalDeleted = 0;
    
    for (const nodeId of nodeIds) {
      const deleted = await this.invalidateNeighborhood(nodeId, tenantContext);
      totalDeleted += deleted;
    }
    
    logger.info(`Invalidated ${totalDeleted} related neighborhood cache entries (tenant: ${tenantContext.tenantId})`);
    return totalDeleted;
  }

  /**
   * Get neighborhoods by investigation
   */
  async getInvestigationNeighborhoods(
    investigationId: string,
    tenantContext: TenantContext
  ): Promise<NeighborhoodData[]> {
    const indexKey = TenantValidator.getTenantCacheKey(
      `${this.indexPrefix}:investigation:${investigationId}`,
      tenantContext
    );
    
    try {
      const nodeIds = await this.redis.smembers(indexKey);
      const neighborhoods: NeighborhoodData[] = [];
      
      for (const nodeId of nodeIds) {
        const neighborhood = await this.getNeighborhood(nodeId, tenantContext);
        if (neighborhood) {
          neighborhoods.push(neighborhood);
        }
      }
      
      return neighborhoods;
      
    } catch (error) {
      logger.error(`Failed to get investigation neighborhoods: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Clear all neighborhood cache for a tenant
   */
  async clearTenantCache(tenantId: string): Promise<void> {
    try {
      const pattern = getTenantCacheKey(tenantId, '*');
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.evictions += keys.length;
        
        logger.info('Cleared tenant neighborhood cache', {
          tenantId,
          keysRemoved: keys.length
        });
      }
    } catch (error) {
      logger.error({ error, tenantId }, 'Error clearing tenant cache');
   * Preload neighborhoods for investigation
   */
  async preloadInvestigation(
    investigationId: string,
    nodeIds: string[],
    tenantContext: TenantContext,
    options: CacheOptions = {}
  ): Promise<void> {
    const indexKey = TenantValidator.getTenantCacheKey(
      `${this.indexPrefix}:investigation:${investigationId}`,
      tenantContext
    );
    
    try {
      // Add node IDs to investigation index
      if (nodeIds.length > 0) {
        await this.redis.sadd(indexKey, ...nodeIds);
        await this.redis.expire(indexKey, options.ttl || this.defaultTTL);
      }
      
      logger.info(`Preloaded investigation ${investigationId} with ${nodeIds.length} nodes (tenant: ${tenantContext.tenantId})`);
      
    } catch (error) {
      logger.error(`Failed to preload investigation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRatio: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRatio = total > 0 ? this.stats.hits / total : 0;
    
    return {
      ...this.stats,
      hitRatio
    };
  }

  /**
   * Warm cache for commonly accessed entities
   */
  async warmCache(
    tenantId: string,
    entityIds: string[],
    getNeighborsFn: (entityId: string, hops: number) => Promise<NeighborhoodData['neighbors']>
  ): Promise<void> {
    logger.info('Warming neighborhood cache', {
      tenantId,
      entityCount: entityIds.length
    });

    const promises = entityIds.map(async (entityId) => {
      for (let hops = 1; hops <= this.maxHops; hops++) {
        try {
          const neighbors = await getNeighborsFn(entityId, hops);
          await this.setNeighborhood(tenantId, entityId, hops, neighbors, this.defaultTTL * 2);
        } catch (error) {
          logger.error({ error, entityId, hops }, 'Error warming cache for entity');
        }
      }
    });

    await Promise.all(promises);
    logger.info('Cache warming completed', { tenantId });
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; stats: any }> {
    try {
      await this.redis.ping();
      const info = await this.redis.info('memory');
      const stats = this.getStats();
      
      return {
        status: 'healthy',
        stats: {
          ...stats,
          memory: info
        }
      };
    } catch (error) {
      logger.error({ error }, 'Neighborhood cache health check failed');
      return {
        status: 'unhealthy',
        stats: this.getStats()
      };
    }
  }

  private generateKey(tenantId: string, entityId: string, hops: number): string {
    return getTenantCacheKey(tenantId, `${entityId}:${hops}`);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  async getStats(): Promise<CacheStats> {
    try {
      const memoryInfo = await this.redis.memory('usage');
      this.stats.memoryUsage = parseInt(memoryInfo.toString()) || 0;
      this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
      
      return { ...this.stats };
      
    } catch (error) {
      logger.error(`Failed to get cache stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.stats;
    }
  }

  /**
   * Clear all cache data for tenant
   */
  async clearTenantCache(tenantContext: TenantContext): Promise<number> {
    try {
      const pattern = TenantValidator.getTenantCacheKey(`${this.keyPrefix}:*`, tenantContext);
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        this.stats.invalidations += deleted;
        logger.info(`Cleared ${deleted} cache entries for tenant ${tenantContext.tenantId}`);
        return deleted;
      }
      
      return 0;
      
    } catch (error) {
      logger.error(`Failed to clear tenant cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  /**
   * Generate cache key for neighborhood
   */
  private generateNeighborhoodKey(
    nodeId: string,
    tenantContext: TenantContext,
    depth: number,
    maxNeighbors: number
  ): string {
    return TenantValidator.getTenantCacheKey(
      `${this.keyPrefix}:${nodeId}:d${depth}:n${maxNeighbors}`,
      tenantContext
    );
  }

  /**
   * Generate pattern for neighborhood keys
   */
  private generateNeighborhoodPattern(
    nodeId: string,
    tenantContext: TenantContext
  ): string {
    return TenantValidator.getTenantCacheKey(
      `${this.keyPrefix}:${nodeId}:*`,
      tenantContext
    );
  }

  /**
   * Update indexes for efficient lookups
   */
  private async updateIndexes(
    nodeId: string,
    tenantContext: TenantContext,
    cacheKey: string
  ): Promise<void> {
    const nodeIndexKey = TenantValidator.getTenantCacheKey(
      `${this.indexPrefix}:node:${nodeId}`,
      tenantContext
    );
    
    try {
      await this.redis.sadd(nodeIndexKey, cacheKey);
      await this.redis.expire(nodeIndexKey, this.defaultTTL);
    } catch (error) {
      logger.warn(`Failed to update indexes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove from indexes
   */
  private async removeFromIndexes(
    nodeId: string,
    tenantContext: TenantContext
  ): Promise<void> {
    const nodeIndexKey = TenantValidator.getTenantCacheKey(
      `${this.indexPrefix}:node:${nodeId}`,
      tenantContext
    );
    
    try {
      await this.redis.del(nodeIndexKey);
    } catch (error) {
      logger.warn(`Failed to remove from indexes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isDataValid(data: NeighborhoodData): boolean {
    if (!data.metadata?.lastUpdated || !data.metadata?.ttl) {
      return false;
    }
    
    const lastUpdated = new Date(data.metadata.lastUpdated);
    const expiry = new Date(lastUpdated.getTime() + (data.metadata.ttl * 1000));
    
    return new Date() < expiry;
  }

  /**
   * Compress data for storage
   */
  private compress(data: NeighborhoodData): string {
    // Simple compression - in production, use zlib or similar
    return JSON.stringify(data);
  }

  /**
   * Decompress data from storage
   */
  private decompress(data: string): NeighborhoodData {
    return JSON.parse(data);
  }

  /**
   * Cleanup old entries if cache is getting full
   */
  private async cleanupIfNeeded(tenantContext: TenantContext): Promise<void> {
    try {
      const pattern = TenantValidator.getTenantCacheKey(`${this.keyPrefix}:*`, tenantContext);
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > this.maxNeighborhoods) {
        // Remove 10% of oldest entries
        const toRemove = Math.floor(keys.length * 0.1);
        const keysToRemove = keys.slice(0, toRemove);
        
        if (keysToRemove.length > 0) {
          await this.redis.del(...keysToRemove);
          logger.info(`Cleaned up ${keysToRemove.length} old cache entries for tenant ${tenantContext.tenantId}`);
        }
      }
    } catch (error) {
      logger.warn(`Failed to cleanup cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize cache monitoring
   */
  private initializeMonitoring(): void {
    // Reset stats periodically
    setInterval(() => {
      logger.info(`Cache stats: ${JSON.stringify(this.stats)}`);
    }, 300000); // Every 5 minutes
  }
}

export default NeighborhoodCache;