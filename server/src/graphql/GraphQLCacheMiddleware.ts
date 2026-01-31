import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { GraphQLCacheManager } from './GraphQLCacheManager.js';
import { logger } from '../config/logger.js';
import { SHA256 } from 'crypto-js';

export interface GraphQLCacheMiddlewareOptions {
  redis: Redis;
  dbPool: Pool;
  enabled?: boolean;
  ttl?: number;
  skipList?: string[]; // Operations to skip caching for
  cacheCondition?: (req: Request, result: any) => boolean;
}

/**
 * GraphQL Response Caching Middleware
 * Implements response caching for GraphQL queries with Redis backend
 */
export const createGraphQLCacheMiddleware = (options: GraphQLCacheMiddlewareOptions) => {
  const { redis, dbPool, enabled = true, ttl = 300, skipList = [], cacheCondition } = options;
  const cacheManager = new GraphQLCacheManager({ 
    redis, 
    dbPool, 
    config: { ttl, enabled } 
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!enabled) {
      return next();
    }

    // Only cache POST requests with GraphQL queries
    if (req.method !== 'POST' || !req.body || !req.body.query) {
      return next();
    }

    // Don't cache mutations or subscriptions
    if (req.body.query.includes('mutation') || req.body.query.includes('subscription')) {
      return next();
    }

    // Check if operation should be skipped
    const operationName = req.body.operationName || 'anonymous';
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const userId = (req as any).user?.id || 'anonymous';
    
    if (skipList.includes(operationName)) {
      logger.debug(`Skipping cache for operation: ${operationName}`, {
        cacheKey: 'skipped',
        operationName,
        tenantId,
        userId
      });
      return next();
    }

    // Generate cache key based on query hash and variables
    const queryHash = SHA256(req.body.query).toString();
    const finalCacheKey = cacheManager.createResponseCacheKey(
      queryHash, 
      req.body.variables || {}, 
      userId, 
      tenantId
    );

    try {
      // Attempt to get response from cache
      const cachedResponse = await cacheManager.get(finalCacheKey);

      if (cachedResponse) {
        // Serve from cache
        logger.debug('Serving GraphQL response from cache', { 
          operationName: req.body.operationName || 'anonymous', 
          cacheKey: finalCacheKey, 
          tenantId: tenantId,
          userId: userId
        });

        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', finalCacheKey);
        return res.json(cachedResponse);
      } else {
        // Not in cache, proceed with normal execution but intercept response
        logger.debug('GraphQL response cache miss, proceeding with execution', { 
          operationName: req.body.operationName || 'anonymous', 
          cacheKey: finalCacheKey, 
          tenantId: tenantId,
          userId: userId
        });

        // Store original json function
        const originalJson = res.json;

        // Intercept response
        res.json = (data: any) => {
          if (data && data.data) {
            // Don't cache if there are errors in the response
            if (!data.errors || data.errors.length === 0) {
              // Cache the response if it meets criteria
              let shouldCache = true;
              if (cacheCondition) {
                shouldCache = cacheCondition(req, data);
              }
              
              if (shouldCache) {
                cacheManager.set(finalCacheKey, data, { ttl: ttl }).then(success => {
                  if (success) {
                    logger.debug('GraphQL response cached successfully', {
                      operationName: req.body.operationName || 'anonymous',
                      cacheKey: finalCacheKey,
                      responseSize: JSON.stringify(data).length,
                      tenantId: tenantId,
                      userId: userId
                    });
                  } else {
                    logger.warn('Failed to cache GraphQL response', {
                      operationName: req.body.operationName || 'anonymous',
                      cacheKey: finalCacheKey,
                      tenantId: tenantId,
                      userId: userId
                    });
                  }
                }).catch(err => {
                  logger.error('Error caching GraphQL response:', err);
                });
              }
            }
          }

          res.set('X-Cache', 'MISS');
          res.set('X-Cache-Key', finalCacheKey);
          return originalJson.call(res, data);
        };

        next();
      }
    } catch (error) {
      logger.error('GraphQL cache middleware error:', error);
      // On cache error, continue with normal execution
      next();
    }
  };
};

/**
 * Persisted Query Middleware
 * Handles persisted GraphQL queries with caching
 */
export const createPersistedQueryMiddleware = (options: { redis: Redis; dbPool: Pool }) => {
  const { redis, dbPool } = options;
  const cacheManager = new GraphQLCacheManager({ 
    redis, 
    dbPool, 
    config: { enabled: true, ttl: 3600 } 
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    // Handle persisted queries if present
    if (req.body && req.body.extensions && req.body.extensions.persistedQuery) {
      const { version, sha256Hash } = req.body.extensions.persistedQuery;

      if (version !== 1) {
        return res.status(400).json({
          errors: [{ message: 'Unsupported persisted query version' }]
        });
      }

      try {
        const persistedQuery = await cacheManager.getPersistedQuery(
          sha256Hash, 
          req.headers['x-tenant-id'] as string
        );

        if (!persistedQuery) {
          return res.status(400).json({
            errors: [{ message: 'Persisted query not found' }]
          });
        }

        // Replace query in request body with persisted query
        req.body.query = persistedQuery;

        const actualTenantId = req.headers['x-tenant-id'] as string || 'default';
        const actualUserId = (req as any).user?.id || 'anonymous';
        
        logger.debug('Served persisted GraphQL query', {
          operationHash: sha256Hash,
          tenantId: actualTenantId,
          userId: actualUserId
        });
      } catch (error: any) {
        logger.error('Error retrieving persisted query:', error);
        return res.status(500).json({
          errors: [{ message: 'Internal server error' }]
        });
      }
    }

    next();
  };
};

/**
 * CDN Integration Middleware
 * Adds appropriate caching headers for CDN integration
 */
export const createCDNIntegrationMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // For GraphQL responses, we need to be careful about caching
    // Only allow caching for certain operations that don't involve user-specific data
    
    if (req.method === 'POST' && req.body && req.body.query) {
      const query = req.body.query as string;
      const actualTenantId = req.headers['x-tenant-id'] as string || 'default';
      const actualUserId = (req as any).user?.id || 'anonymous';
      
      // Don't cache if query involves user-specific data
      if (query.includes('$currentUser') || query.includes('my') || 
          (query.toLowerCase().includes('user') && query.includes('me'))) {
        // Add headers to prevent caching
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
      } else {
        // Allow CDN to cache for a short time (if response is cacheable)
        res.set('Cache-Control', `public, max-age=${60*5}, s-maxage=${60*10}`); // 5 min client, 10 min CDN
        res.set('CDN-Cache-Control', `max-age=${60*10}`); // 10 minutes for CDN
        res.set('Vary', 'Authorization, X-Tenant-Id'); // Cache varies by tenant
      }
    }

    next();
  };
};