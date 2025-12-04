/**
 * Automatic Persisted Queries (APQ) Plugin for Apollo Server
 * Implements APQ protocol to reduce network bandwidth and improve caching
 *
 * APQ allows clients to send query hashes instead of full queries
 * The server caches queries by hash and returns "PersistedQueryNotFound" if not cached
 * Client then sends the full query which gets cached for future requests
 */

import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLError } from 'graphql';
import crypto from 'crypto';
import pino from 'pino';
import type { Redis } from 'ioredis';
import { PersistedQueryService } from '../persisted-query-service.js';

const logger = pino();

export interface APQOptions {
  /**
   * Redis client for distributed APQ cache
   * If not provided, uses in-memory cache (not recommended for production)
   */
  redis?: Redis;

  /**
   * TTL for cached queries in seconds
   * @default 86400 (24 hours)
   */
  ttl?: number;

  /**
   * Whether to enable APQ
   * @default true
   */
  enabled?: boolean;

  /**
   * Prefix for Redis keys
   * @default 'apq:'
   */
  keyPrefix?: string;
}

// In-memory cache for development (not suitable for production with multiple instances)
const memoryCache = new Map<string, string>();

/**
 * Hash a GraphQL query using SHA-256
 */
function hashQuery(query: string): string {
  return crypto.createHash('sha256').update(query).digest('hex');
}

/**
 * Creates an APQ plugin for Apollo Server
 */
export function createAPQPlugin(options: APQOptions = {}): ApolloServerPlugin {
  const {
    redis,
    ttl = 86400, // 24 hours
    enabled = true,
    keyPrefix = 'apq:',
  } = options;

  if (!enabled) {
    return {}; // Return empty plugin if disabled
  }

  // Warn if using memory cache in production
  if (!redis && process.env.NODE_ENV === 'production') {
    logger.warn(
      'APQ is using in-memory cache in production. Consider using Redis for distributed caching.'
    );
  }

  /**
   * Cache Priming: Load queries from DB on startup
   */
  (async () => {
    try {
      const service = PersistedQueryService.getInstance();
      const queries = await service.listQueries();
      logger.info({ count: queries.length }, 'APQ: Priming cache with persisted queries');
      for (const q of queries) {
        await setQuery(q.sha256, q.query);
      }
    } catch (err) {
      // It's possible DB is not ready or table doesn't exist yet (first run)
      logger.warn({ err }, 'APQ: Failed to prime cache from DB');
    }
  })();

  /**
   * Get query from cache
   */
  async function getQuery(hash: string): Promise<string | null> {
    // 1. Try Redis/Memory Cache
    let query: string | null = null;
    if (redis) {
      const key = `${keyPrefix}${hash}`;
      query = await redis.get(key);
    } else {
      query = memoryCache.get(hash) || null;
    }

    // 2. Fallback to DB if not in cache (and cache it)
    if (!query) {
       try {
         const service = PersistedQueryService.getInstance();
         query = await service.getQueryByHash(hash);
         if (query) {
           await setQuery(hash, query);
           logger.debug({ hash }, 'APQ: Cache miss resolved from DB');
         }
       } catch (err) {
         logger.warn({ err, hash }, 'APQ: DB lookup failed');
       }
    }

    return query;
  }

  /**
   * Store query in cache
   */
  async function setQuery(hash: string, query: string): Promise<void> {
    if (redis) {
      const key = `${keyPrefix}${hash}`;
      await redis.setex(key, ttl, query);
    } else {
      memoryCache.set(hash, query);
      // Limit memory cache size
      if (memoryCache.size > 1000) {
        const firstKey = memoryCache.keys().next().value;
        memoryCache.delete(firstKey);
      }
    }
  }

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
      return {
        async didResolveSource({ request, source }) {
          // Check if this is an APQ request
          const extensions = request.extensions as any;
          const persistedQuery = extensions?.persistedQuery;

          if (!persistedQuery) {
            // Not an APQ request, continue normally
            return;
          }

          const { sha256Hash, version } = persistedQuery;

          // Validate APQ protocol version
          if (version !== 1) {
            throw new GraphQLError('PersistedQueryNotSupported', {
              extensions: {
                code: 'PERSISTED_QUERY_NOT_SUPPORTED',
              },
            });
          }

          // If query is provided, verify hash and cache it
          if (source && source.body) {
            const computedHash = hashQuery(source.body);

            // Verify that the provided hash matches the query
            if (computedHash !== sha256Hash) {
              throw new GraphQLError('provided sha does not match query', {
                extensions: {
                  code: 'PERSISTED_QUERY_HASH_MISMATCH',
                },
              });
            }

            // Cache the query
            await setQuery(sha256Hash, source.body);

            logger.debug(
              {
                hash: sha256Hash,
                queryLength: source.body.length,
              },
              'APQ: Cached new query'
            );

            return;
          }

          // Query not provided, try to retrieve from cache
          const cachedQuery = await getQuery(sha256Hash);

          if (!cachedQuery) {
            // Query not found in cache
            throw new GraphQLError('PersistedQueryNotFound', {
              extensions: {
                code: 'PERSISTED_QUERY_NOT_FOUND',
              },
            });
          }

          // Replace the request with the cached query
          request.query = cachedQuery;

          logger.debug(
            {
              hash: sha256Hash,
            },
            'APQ: Retrieved query from cache'
          );
        },
      };
    },
  };
}

/**
 * Get APQ cache statistics
 */
export async function getAPQStats(redis?: Redis): Promise<{
  cacheSize: number;
  cacheType: 'redis' | 'memory';
}> {
  if (redis) {
    // Get approximate count of APQ keys in Redis
    const keys = await redis.keys('apq:*');
    return {
      cacheSize: keys.length,
      cacheType: 'redis',
    };
  }

  return {
    cacheSize: memoryCache.size,
    cacheType: 'memory',
  };
}

/**
 * Clear APQ cache
 */
export async function clearAPQCache(redis?: Redis): Promise<void> {
  if (redis) {
    const keys = await redis.keys('apq:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    logger.info({ count: keys.length }, 'Cleared APQ cache from Redis');
  } else {
    const size = memoryCache.size;
    memoryCache.clear();
    logger.info({ count: size }, 'Cleared APQ cache from memory');
  }
}
