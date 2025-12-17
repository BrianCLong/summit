const logger = require('./logger');

/**
 * Simple cache wrapper.
 * In production this would use Redis.
 * For now we mock it or use a simple in-memory map if Redis is not configured.
 *
 * WARNING: This in-memory cache is local to the Node.js process. In a clustered environment,
 * or when scaling horizontally, this cache will not be shared. A Redis or Memcached solution
 * should be used for production.
 */

const cache = new Map();

const withCache = async (key, ttlSeconds, fetchFn) => {
  // Check in-memory cache first (Simple LRU substitute)
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }

  try {
    const result = await fetchFn();
    if (result) {
      cache.set(key, {
        value: result,
        expiry: Date.now() + (ttlSeconds * 1000)
      });

      // Prevent unbounded growth
      if (cache.size > 1000) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
    }
    return result;
  } catch (err) {
    logger.warn(`Cache fetch failed for ${key}`, err);
    throw err;
  }
};

module.exports = { withCache };
