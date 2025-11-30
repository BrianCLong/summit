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

  /**
   * Whether to enforce allowlisting (only pre-registered queries allowed)
   * @default false
   */
  allowlistEnabled?: boolean;
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
    allowlistEnabled = false,
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
   * Get query from cache
   */
  async function getQuery(hash: string): Promise<string | null> {
    if (redis) {
      const key = `${keyPrefix}${hash}`;
      return await redis.get(key);
    }
    return memoryCache.get(hash) || null;
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
            // Not an APQ request.
            // If allowlist is enabled, we should BLOCK standard queries unless they are somehow exempted
            // or if allowlisting strictly applies to APQ flow.
            // Usually, strict security means "No arbitrary queries at all".
            if (allowlistEnabled) {
                 throw new GraphQLError('Only persisted queries are allowed', {
                    extensions: {
                        code: 'PERSISTED_QUERY_REQUIRED',
                    }
                 });
            }
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

          // If query is provided...
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

            // If allowlisting is enabled, clients CANNOT register new queries at runtime.
            // The query must already exist in the cache (preloaded).
            if (allowlistEnabled) {
                const exists = await getQuery(sha256Hash);
                if (!exists) {
                     throw new GraphQLError('Query not found in allowlist', {
                        extensions: {
                            code: 'PERSISTED_QUERY_NOT_ALLOWED',
                        }
                     });
                }
                // If it exists, we are good. We don't need to set it again.
                return;
            }

            // Normal APQ: Cache the query
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
 * Preload allowlist of queries
 */
export async function preloadAllowlist(
    queries: Record<string, string>,
    redis?: Redis,
    keyPrefix: string = 'apq:'
): Promise<void> {
    const promises = [];
    for (const [hash, query] of Object.entries(queries)) {
        if (redis) {
            // Persist indefinitely or long TTL
            promises.push(redis.set(`${keyPrefix}${hash}`, query));
        } else {
            memoryCache.set(hash, query);
        }
    }
    if (promises.length > 0) await Promise.all(promises);
    logger.info({ count: Object.keys(queries).length }, 'Preloaded APQ allowlist');
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
