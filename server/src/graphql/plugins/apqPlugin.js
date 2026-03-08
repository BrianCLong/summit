"use strict";
// @ts-nocheck
/**
 * Automatic Persisted Queries (APQ) Plugin for Apollo Server
 * Implements APQ protocol to reduce network bandwidth and improve caching
 *
 * APQ allows clients to send query hashes instead of full queries
 * The server caches queries by hash and returns "PersistedQueryNotFound" if not cached
 * Client then sends the full query which gets cached for future requests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAPQPlugin = createAPQPlugin;
exports.preloadAllowlist = preloadAllowlist;
exports.getAPQStats = getAPQStats;
exports.clearAPQCache = clearAPQCache;
const graphql_1 = require("graphql");
const crypto_1 = __importDefault(require("crypto"));
const pino_1 = __importDefault(require("pino"));
const cache_1 = require("@packages/cache");
const logger = pino_1.default();
/**
 * Hash a GraphQL query using SHA-256
 */
function hashQuery(query) {
    return crypto_1.default.createHash('sha256').update(query).digest('hex');
}
/**
 * Creates an APQ plugin for Apollo Server
 */
function createAPQPlugin(options = {}) {
    const { redis, ttl = 86400, // 24 hours
    enabled = true, keyPrefix = 'apq:', allowlistEnabled = false, } = options;
    const cache = (0, cache_1.createCacheClient)({
        redis,
        redisUrl: process.env.REDIS_URL,
        namespace: 'graphql-apq',
        cacheClass: 'critical_path',
        defaultTTLSeconds: ttl,
        logger,
    });
    if (!enabled) {
        return {}; // Return empty plugin if disabled
    }
    /**
     * Get query from cache
     */
    async function getQuery(hash) {
        const key = `${keyPrefix}${hash}`;
        return cache.get(key);
    }
    /**
     * Store query in cache
     */
    async function setQuery(hash, query) {
        const key = `${keyPrefix}${hash}`;
        await cache.set(key, query, {
            ttlSeconds: ttl,
            cacheClass: 'critical_path',
            namespace: 'graphql-apq',
        });
    }
    return {
        async requestDidStart() {
            return {
                async didResolveSource({ request, source }) {
                    // Check if this is an APQ request
                    const extensions = request.extensions;
                    const persistedQuery = extensions?.persistedQuery;
                    if (!persistedQuery) {
                        // Not an APQ request.
                        // If allowlist is enabled, we should BLOCK standard queries unless they are somehow exempted
                        // or if allowlisting strictly applies to APQ flow.
                        // Usually, strict security means "No arbitrary queries at all".
                        if (allowlistEnabled) {
                            throw new graphql_1.GraphQLError('Only persisted queries are allowed', {
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
                        throw new graphql_1.GraphQLError('PersistedQueryNotSupported', {
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
                            throw new graphql_1.GraphQLError('provided sha does not match query', {
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
                                throw new graphql_1.GraphQLError('Query not found in allowlist', {
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
                        logger.debug({
                            hash: sha256Hash,
                            queryLength: source.body.length,
                        }, 'APQ: Cached new query');
                        return;
                    }
                    // Query not provided, try to retrieve from cache
                    const cachedQuery = await getQuery(sha256Hash);
                    if (!cachedQuery) {
                        // Query not found in cache
                        throw new graphql_1.GraphQLError('PersistedQueryNotFound', {
                            extensions: {
                                code: 'PERSISTED_QUERY_NOT_FOUND',
                            },
                        });
                    }
                    // Replace the request with the cached query
                    request.query = cachedQuery;
                    logger.debug({
                        hash: sha256Hash,
                    }, 'APQ: Retrieved query from cache');
                },
            };
        },
    };
}
/**
 * Preload allowlist of queries
 */
async function preloadAllowlist(queries, redis, keyPrefix = 'apq:') {
    const promises = [];
    for (const [hash, query] of Object.entries(queries)) {
        if (redis) {
            // Persist indefinitely or long TTL
            promises.push(redis.set(`${keyPrefix}${hash}`, query));
        }
        else {
            memoryCache.set(hash, query);
        }
    }
    if (promises.length > 0)
        await Promise.all(promises);
    logger.info({ count: Object.keys(queries).length }, 'Preloaded APQ allowlist');
}
/**
 * Get APQ cache statistics
 */
async function getAPQStats(redis) {
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
async function clearAPQCache(redis) {
    if (redis) {
        const keys = await redis.keys('apq:*');
        if (keys.length > 0) {
            await redis.del(...keys);
        }
        logger.info({ count: keys.length }, 'Cleared APQ cache from Redis');
    }
    else {
        const size = memoryCache.size;
        memoryCache.clear();
        logger.info({ count: size }, 'Cleared APQ cache from memory');
    }
}
