import { Request, Response, NextFunction } from 'express';
import { GraphQLError } from 'graphql';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import crypto from 'crypto';
import { redisClient } from '../db/redis.js';

// Configuration interface for GraphQL security
export interface SecurityConfig {
  maxDepth: number;
  maxComplexity: number;
  maxCost: number;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  enforcePersistedQueries: boolean;
  enableQueryWhitelist: boolean;
}

// Default configuration
const defaultConfig: SecurityConfig = {
  maxDepth: 10,
  maxComplexity: 1000,
  maxCost: 5000,
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    skipSuccessfulRequests: false,
  },
  enforcePersistedQueries: process.env.NODE_ENV === 'production',
  enableQueryWhitelist: process.env.NODE_ENV === 'production',
};

// Internal caches and stores
const persistedQueries = new Map<string, string>();
const queryWhitelist = new Set<string>();

// Dynamic imports for optional advanced security modules
let depthLimitModule: any;
let queryComplexityModule: any;
let costAnalysisModule: any;

try {
  // @ts-ignore
  depthLimitModule = await import('graphql-depth-limit');
} catch (e) {
  /* Ignore */
}

try {
  // @ts-ignore
  queryComplexityModule = await import('graphql-query-complexity');
} catch (e) {
  /* Ignore */
}

try {
  // @ts-ignore
  costAnalysisModule = await import('graphql-cost-analysis');
} catch (e) {
  /* Ignore */
}

// Basic validation rules that don't require external packages
const specifiedRules = [];

// Depth limiting validation rule
function createDepthAnalysis(maxDepth: number) {
  if (!depthLimitModule?.default) {
    console.warn('graphql-depth-limit not available, skipping depth rule');
    return () => ({});
  }
  return depthLimitModule.default(maxDepth, { ignore: ['__schema', '__type'] });
}

// Complexity analysis validation rule
function createComplexityAnalysis(maxComplexity: number) {
  const getComplexity = queryComplexityModule?.getComplexity;
  if (!getComplexity) {
    console.warn(
      'graphql-query-complexity not available, skipping complexity rule',
    );
    return () => ({});
  }

  // Simple complexity estimator
  return (context: any) => {
    try {
      const complexity = getComplexity({
        estimators: [
          queryComplexityModule.simpleEstimator({ defaultComplexity: 1 }),
        ],
        schema: context.schema,
        query: context.document,
        variables: context.variableValues,
      });

      if (complexity > maxComplexity) {
        throw new GraphQLError(
          `Query is too complex: ${complexity}. Maximum allowed complexity: ${maxComplexity}`,
          { extensions: { code: 'QUERY_TOO_COMPLEX' } },
        );
      }
    } catch (e: any) {
      if (e instanceof GraphQLError) throw e;
      // Continue if complexity calculation fails
    }
    return {};
  };
}

// Cost analysis for resource-intensive operations
function createCostAnalysis(maxCost: number) {
  const costAnalysis = costAnalysisModule?.costAnalysis;
  if (!costAnalysis) {
    console.warn('graphql-cost-analysis not available, skipping cost rules');
    return () => ({});
  }

  return costAnalysis({
    maximumCost: maxCost,
    defaultCost: 1,
    scalarCost: 1,
    objectCost: 2,
    listFactor: 10,
    costMap: {
      // High-cost operations
      'Query.analytics': { cost: 100 },
      'Query.search': { cost: 50 },
      'Query.recommendations': { cost: 75 },
      'Query.shortestPath': { cost: 150 },
      'Query.communityDetection': { cost: 500 },
      'Query.pageRank': { cost: 300 },

      // Entity operations
      'Query.entities': { cost: 20, multipliers: ['first', 'last'] },
      'Query.relationships': { cost: 15, multipliers: ['first', 'last'] },

      // Mutations
      'Mutation.createEntity': { cost: 10 },
      'Mutation.updateEntity': { cost: 8 },
      'Mutation.deleteEntity': { cost: 12 },
      'Mutation.bulkImport': { cost: 200 },

      // Subscriptions
      'Subscription.entityUpdates': { cost: 25 },
      'Subscription.liveAnalytics': { cost: 100 },
    },
    onComplete: (cost: number) => {
      console.log(`Query cost: ${cost}`);
    },
  });
}

// Query sanitization and validation
function sanitizeQuery(query: string): string {
  // Remove comments
  query = query.replace(/\s*#.*$/gm, '');

  // Normalize whitespace
  query = query.replace(/\s+/g, ' ').trim();

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\b__schema\b.*\btypes\b.*\bfields\b/i, // Introspection attacks
    /\bmutation\b.*\bdelete\b.*\ball\b/i, // Dangerous bulk operations
    /\bunion\b.*\bselect\b/i, // SQL injection attempts
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(query)) {
      throw new GraphQLError('Query contains suspicious patterns', {
        extensions: { code: 'QUERY_REJECTED', reason: 'suspicious_pattern' },
      });
    }
  }

  return query;
}

// Rate limiting middleware
export const createRateLimiter = (config: SecurityConfig['rateLimit']) => {
  let store: RedisStore | undefined;
  try {
    // If using a cluster, rate-limit-redis needs sendCommandCluster
    const isCluster = (redisClient as any).constructor.name === 'Cluster';

    // NOTE: rate-limit-redis v3+ signature:
    // new RedisStore({
    //   sendCommand: (...args: string[]) => client.call(...args),
    // })

    // However, older versions or different adaptors might vary.
    // Assuming standard ioredis client compatibility:

    store = new RedisStore({
      // @ts-ignore
      sendCommand: (...args: string[]) => redisClient.call(...args),
      prefix: 'graphql:rate:',
    });
  } catch (error: any) {
    console.warn(
      'rate-limit-redis unavailable, falling back to in-memory store',
      error?.message || error,
    );
  }

  return rateLimit({
    ...(store ? { store } : {}),
    windowMs: config.windowMs,
    max: config.maxRequests,
    message: {
      error: 'Too many GraphQL requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(config.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/metrics';
    },
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      const user = (req as any).user;
      if (user?.id) {
        return `user:${user.id}`;
      }
      return `ip:${req.ip}`;
    },
    skipSuccessfulRequests: config.skipSuccessfulRequests,
  });
};

// Persisted queries middleware
export function persistedQueriesMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.method !== 'POST' || !req.body) {
    return next();
  }

  const { query, persistedQuery } = req.body;

  // Handle persisted query requests
  if (persistedQuery) {
    const { version, sha256Hash } = persistedQuery;

    if (version !== 1) {
      res.status(400).json({
        errors: [
          {
            message: 'Unsupported persisted query version',
            extensions: { code: 'PERSISTED_QUERY_NOT_SUPPORTED' },
          },
        ],
      });
      return;
    }

    if (!sha256Hash) {
      res.status(400).json({
        errors: [
          {
            message: 'Missing persisted query hash',
            extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' },
          },
        ],
      });
      return;
    }

    // Try to find the persisted query
    const persistedQueryText = persistedQueries.get(sha256Hash);

    if (!persistedQueryText) {
      if (!query) {
        res.status(400).json({
          errors: [
            {
              message: 'Persisted query not found',
              extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' },
            },
          ],
        });
        return;
      }

      // Register new persisted query
      const computedHash = crypto
        .createHash('sha256')
        .update(query)
        .digest('hex');
      if (computedHash === sha256Hash) {
        persistedQueries.set(sha256Hash, query);
        console.log(`Registered new persisted query: ${sha256Hash}`);
      } else {
        res.status(400).json({
          errors: [
            {
              message: 'Persisted query hash mismatch',
              extensions: { code: 'PERSISTED_QUERY_HASH_MISMATCH' },
            },
          ],
        });
        return;
      }
    } else {
      // Use the persisted query
      req.body.query = persistedQueryText;
    }
  }

  // Enforce persisted queries if configured
  if (defaultConfig.enforcePersistedQueries && !persistedQuery) {
    res.status(400).json({
      errors: [
        {
          message: 'Only persisted queries are allowed',
          extensions: { code: 'PERSISTED_QUERY_REQUIRED' },
        },
      ],
    });
    return;
  }

  next();
}

// Query caching middleware
export async function queryCacheMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.method !== 'POST' || !req.body?.query) {
    return next();
  }

  const { query, variables } = req.body;
  const user = (req as any).user;

  // Only cache read operations
  if (
    query.trim().toLowerCase().startsWith('mutation') ||
    query.trim().toLowerCase().startsWith('subscription')
  ) {
    return next();
  }

  // Create cache key
  const cacheKey = crypto
    .createHash('sha256')
    .update(JSON.stringify({ query, variables, userId: user?.id }))
    .digest('hex');

  try {
    // Check cache
    const cached = await redisClient.get(`graphql:cache:${cacheKey}`);
    if (cached) {
      const result = JSON.parse(cached);
      result.extensions = { ...result.extensions, cached: true };
      res.json(result);
      return;
    }
  } catch (error: any) {
    console.warn('Cache read error:', error);
  }

  // Store original send to intercept response
  const originalSend = res.json;
  res.json = function (data: any) {
    // Cache successful responses for 5 minutes
    if (data && !data.errors) {
      redisClient
        // @ts-ignore
        .setex(`graphql:cache:${cacheKey}`, 300, JSON.stringify(data))
        .catch((error) => console.warn('Cache write error:', error));
    }
    return originalSend.call(this, data);
  };

  next();
}

// Security validation middleware
export function securityValidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.method !== 'POST' || !req.body?.query) {
    return next();
  }

  try {
    const query = sanitizeQuery(req.body.query);
    req.body.query = query;

    // Check against whitelist if enabled
    if (defaultConfig.enableQueryWhitelist && !queryWhitelist.has(query)) {
      res.status(403).json({
        errors: [
          {
            message: 'Query not in whitelist',
            extensions: { code: 'QUERY_NOT_WHITELISTED' },
          },
        ],
      });
      return;
    }

    next();
  } catch (error: any) {
    res.status(400).json({
      errors: [
        {
          message:
            error instanceof Error ? error.message : 'Query validation failed',
          extensions: { code: 'INVALID_QUERY' },
        },
      ],
    });
  }
}

// Metrics collection middleware
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = performance.now();
  const originalSend = res.json;

  res.json = function (data: any) {
    const duration = performance.now() - startTime;

    // Collect metrics
    const metrics: Partial<any> = {
      duration,
      cached: data?.extensions?.cached || false,
      userId: (req as any).user?.id,
      organizationId: (req as any).user?.organization_id,
    };

    // Send metrics to analytics system
    process.nextTick(() => {
      // This would integrate with your metrics collection system
      console.log('GraphQL Metrics:', metrics);
    });

    return originalSend.call(this, data);
  };

  next();
}

// Main GraphQL hardening middleware factory
export function createGraphQLHardening(config: Partial<SecurityConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  // Create validation rules
  const validationRules = [
    ...specifiedRules,
    createDepthAnalysis(finalConfig.maxDepth),
    createComplexityAnalysis(finalConfig.maxComplexity),
    createCostAnalysis(finalConfig.maxCost),
  ];

  return {
    rateLimiter: createRateLimiter(finalConfig.rateLimit),
    persistedQueries: persistedQueriesMiddleware,
    queryCache: queryCacheMiddleware,
    securityValidation: securityValidationMiddleware,
    metrics: metricsMiddleware,
    validationRules,
    config: finalConfig,
  };
}

// Export default hardening setup
export default createGraphQLHardening();
