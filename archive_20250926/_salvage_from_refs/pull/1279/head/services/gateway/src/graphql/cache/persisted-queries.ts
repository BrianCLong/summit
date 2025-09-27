/**
 * GraphQL Persisted Queries Implementation
 *
 * Enables persisted queries to reduce network payload and improve
 * performance by allowing clients to send query hashes instead of
 * full query strings. Supports automatic query extraction and caching.
 */

import { createHash } from 'crypto';
import { DocumentNode, print } from 'graphql';
import { LRUCache } from 'lru-cache';
import { Redis } from 'ioredis';
import { logger } from '../../utils/logger';

interface PersistedQuery {
  version: number;
  sha256Hash: string;
}

interface PersistedQueryInfo {
  hash: string;
  query: string;
  version: number;
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
}

interface CacheOptions {
  redis?: Redis;
  maxMemoryQueries?: number;
  maxMemoryTTL?: number; // milliseconds
  redisTTL?: number; // seconds
  enableMetrics?: boolean;
}

export class PersistedQueryCache {
  private memoryCache: LRUCache<string, PersistedQueryInfo>;
  private redis?: Redis;
  private redisTTL: number;
  private enableMetrics: boolean;
  private metrics: {
    hits: number;
    misses: number;
    stores: number;
    errors: number;
  };

  constructor(options: CacheOptions = {}) {
    this.memoryCache = new LRUCache({
      max: options.maxMemoryQueries || 1000,
      ttl: options.maxMemoryTTL || 3600000, // 1 hour
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    this.redis = options.redis;
    this.redisTTL = options.redisTTL || 86400; // 24 hours
    this.enableMetrics = options.enableMetrics ?? true;

    this.metrics = {
      hits: 0,
      misses: 0,
      stores: 0,
      errors: 0
    };
  }

  /**
   * Generate SHA-256 hash for a GraphQL query
   */
  static generateHash(query: string): string {
    return createHash('sha256').update(query.trim()).digest('hex');
  }

  /**
   * Normalize and prepare query string for hashing
   */
  static normalizeQuery(query: string | DocumentNode): string {
    if (typeof query === 'string') {
      return query.replace(/\s+/g, ' ').trim();
    }
    return print(query).replace(/\s+/g, ' ').trim();
  }

  /**
   * Store a persisted query
   */
  async store(query: string, hash?: string): Promise<string> {
    try {
      const normalizedQuery = PersistedQueryCache.normalizeQuery(query);
      const queryHash = hash || PersistedQueryCache.generateHash(normalizedQuery);

      const queryInfo: PersistedQueryInfo = {
        hash: queryHash,
        query: normalizedQuery,
        version: 1,
        createdAt: new Date(),
        lastUsed: new Date(),
        useCount: 1
      };

      // Store in memory cache
      this.memoryCache.set(queryHash, queryInfo);

      // Store in Redis if available
      if (this.redis) {
        const redisKey = `pq:${queryHash}`;
        await this.redis.setex(
          redisKey,
          this.redisTTL,
          JSON.stringify({
            query: normalizedQuery,
            version: queryInfo.version,
            createdAt: queryInfo.createdAt.toISOString(),
            lastUsed: queryInfo.lastUsed.toISOString(),
            useCount: queryInfo.useCount
          })
        );
      }

      if (this.enableMetrics) {
        this.metrics.stores++;
      }

      logger.debug(`Stored persisted query: ${queryHash.substring(0, 12)}...`);
      return queryHash;

    } catch (error) {
      if (this.enableMetrics) {
        this.metrics.errors++;
      }
      logger.error('Failed to store persisted query:', error);
      throw error;
    }
  }

  /**
   * Retrieve a persisted query by hash
   */
  async get(hash: string): Promise<string | null> {
    try {
      // Check memory cache first
      const memoryQuery = this.memoryCache.get(hash);
      if (memoryQuery) {
        // Update usage stats
        memoryQuery.lastUsed = new Date();
        memoryQuery.useCount++;
        this.memoryCache.set(hash, memoryQuery);

        if (this.enableMetrics) {
          this.metrics.hits++;
        }

        logger.debug(`Memory cache hit for query: ${hash.substring(0, 12)}...`);
        return memoryQuery.query;
      }

      // Check Redis if available
      if (this.redis) {
        const redisKey = `pq:${hash}`;
        const redisResult = await this.redis.get(redisKey);

        if (redisResult) {
          const queryData = JSON.parse(redisResult);
          const queryInfo: PersistedQueryInfo = {
            hash,
            query: queryData.query,
            version: queryData.version,
            createdAt: new Date(queryData.createdAt),
            lastUsed: new Date(),
            useCount: queryData.useCount + 1
          };

          // Store back in memory cache
          this.memoryCache.set(hash, queryInfo);

          // Update Redis usage stats
          await this.redis.setex(
            redisKey,
            this.redisTTL,
            JSON.stringify({
              ...queryData,
              lastUsed: queryInfo.lastUsed.toISOString(),
              useCount: queryInfo.useCount
            })
          );

          if (this.enableMetrics) {
            this.metrics.hits++;
          }

          logger.debug(`Redis cache hit for query: ${hash.substring(0, 12)}...`);
          return queryInfo.query;
        }
      }

      if (this.enableMetrics) {
        this.metrics.misses++;
      }

      logger.debug(`Cache miss for query: ${hash.substring(0, 12)}...`);
      return null;

    } catch (error) {
      if (this.enableMetrics) {
        this.metrics.errors++;
      }
      logger.error('Failed to retrieve persisted query:', error);
      return null;
    }
  }

  /**
   * Check if a query hash exists in cache
   */
  async has(hash: string): Promise<boolean> {
    try {
      if (this.memoryCache.has(hash)) {
        return true;
      }

      if (this.redis) {
        const exists = await this.redis.exists(`pq:${hash}`);
        return exists === 1;
      }

      return false;
    } catch (error) {
      logger.error('Failed to check persisted query existence:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;

    return {
      ...this.metrics,
      hitRate: Number(hitRate.toFixed(2)),
      memorySize: this.memoryCache.size,
      memoryMax: this.memoryCache.max
    };
  }

  /**
   * Clear all cached queries
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();

      if (this.redis) {
        const keys = await this.redis.keys('pq:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      logger.info('Cleared all persisted queries from cache');
    } catch (error) {
      logger.error('Failed to clear persisted query cache:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics for queries
   */
  async getUsageStats(): Promise<Array<{
    hash: string;
    useCount: number;
    lastUsed: Date;
    createdAt: Date;
  }>> {
    const stats: Array<{
      hash: string;
      useCount: number;
      lastUsed: Date;
      createdAt: Date;
    }> = [];

    // Collect from memory cache
    for (const [hash, info] of this.memoryCache.entries()) {
      stats.push({
        hash,
        useCount: info.useCount,
        lastUsed: info.lastUsed,
        createdAt: info.createdAt
      });
    }

    return stats.sort((a, b) => b.useCount - a.useCount);
  }

  /**
   * Extract and register queries from a GraphQL schema
   */
  async extractAndRegisterQueries(introspectionResult: any): Promise<string[]> {
    const registeredHashes: string[] = [];

    try {
      // This would typically be used during build time to pre-register
      // commonly used queries. For now, we'll return empty array as
      // queries are registered on-demand.

      logger.info('Query extraction not implemented - using on-demand registration');
      return registeredHashes;

    } catch (error) {
      logger.error('Failed to extract and register queries:', error);
      return registeredHashes;
    }
  }
}

/**
 * GraphQL middleware for handling persisted queries
 */
export function createPersistedQueryMiddleware(cache: PersistedQueryCache) {
  return async (req: any, res: any, next: any) => {
    try {
      const { extensions, query } = req.body;

      // Check if this is a persisted query request
      if (extensions?.persistedQuery) {
        const persistedQuery: PersistedQuery = extensions.persistedQuery;

        if (persistedQuery.version !== 1) {
          return res.status(400).json({
            errors: [{
              message: 'Unsupported persisted query version',
              extensions: {
                code: 'PERSISTED_QUERY_NOT_SUPPORTED'
              }
            }]
          });
        }

        const { sha256Hash } = persistedQuery;

        // Try to get the query from cache
        const cachedQuery = await cache.get(sha256Hash);

        if (cachedQuery) {
          // Replace the request with the cached query
          req.body.query = cachedQuery;
          logger.debug(`Using persisted query: ${sha256Hash.substring(0, 12)}...`);
        } else if (!query) {
          // Query not found and no fallback provided
          return res.status(400).json({
            errors: [{
              message: 'PersistedQueryNotFound',
              extensions: {
                code: 'PERSISTED_QUERY_NOT_FOUND'
              }
            }]
          });
        } else {
          // Store the query for future use
          const computedHash = PersistedQueryCache.generateHash(query);

          if (computedHash === sha256Hash) {
            await cache.store(query, sha256Hash);
            logger.debug(`Registered new persisted query: ${sha256Hash.substring(0, 12)}...`);
          } else {
            return res.status(400).json({
              errors: [{
                message: 'Query hash mismatch',
                extensions: {
                  code: 'PERSISTED_QUERY_HASH_MISMATCH'
                }
              }]
            });
          }
        }
      }

      next();

    } catch (error) {
      logger.error('Persisted query middleware error:', error);
      res.status(500).json({
        errors: [{
          message: 'Internal server error',
          extensions: {
            code: 'INTERNAL_ERROR'
          }
        }]
      });
    }
  };
}

/**
 * Utility to generate persisted query manifest for client-side usage
 */
export async function generateQueryManifest(
  cache: PersistedQueryCache,
  outputPath?: string
): Promise<Record<string, string>> {
  const manifest: Record<string, string> = {};
  const stats = await cache.getUsageStats();

  for (const stat of stats) {
    const query = await cache.get(stat.hash);
    if (query) {
      manifest[stat.hash] = query;
    }
  }

  if (outputPath) {
    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2));
    logger.info(`Generated query manifest at: ${outputPath}`);
  }

  return manifest;
}

export default PersistedQueryCache;