/**
 * GraphQL Security and Performance Hardening Middleware
 * Production-grade middleware for IntelGraph Maestro API
 */

import { Request, Response, NextFunction } from 'express';
import {
  GraphQLError,
  ValidationContext,
  validate,
  specifiedRules,
} from 'graphql';
import { depthLimit } from 'graphql-depth-limit';
import { costAnalysis } from 'graphql-cost-analysis';
import { createComplexityLimitRule } from 'graphql-query-complexity';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

// Types
interface SecurityConfig {
  maxDepth: number;
  maxComplexity: number;
  maxCost: number;
  enforcePersistedQueries: boolean;
  enableQueryWhitelist: boolean;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
}

interface QueryMetrics {
  queryId: string;
  query: string;
  variables: any;
  complexity: number;
  depth: number;
  cost: number;
  duration: number;
  cached: boolean;
  userId?: string;
  organizationId?: string;
}

// Default configuration
const defaultConfig: SecurityConfig = {
  maxDepth: parseInt(process.env.GRAPHQL_MAX_DEPTH || '15'),
  maxComplexity: parseInt(process.env.GRAPHQL_MAX_COMPLEXITY || '10000'),
  maxCost: parseInt(process.env.GRAPHQL_MAX_COST || '5000'),
  enforcePersistedQueries: process.env.GRAPHQL_ENFORCE_PERSISTED === 'true',
  enableQueryWhitelist: process.env.GRAPHQL_ENABLE_WHITELIST === 'true',
  rateLimit: {
    windowMs: parseInt(process.env.GRAPHQL_RATE_WINDOW_MS || '60000'), // 1 minute
    maxRequests: parseInt(process.env.GRAPHQL_RATE_MAX_REQUESTS || '1000'),
    skipSuccessfulRequests: false,
  },
};

// Redis client for caching and rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'redis-master',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});

// Persisted queries store
const persistedQueries = new Map<string, string>();

// Query whitelist (for high-security environments)
const queryWhitelist = new Set<string>();

// Load persisted queries from file or database
export async function loadPersistedQueries(
  queriesPath?: string,
): Promise<void> {
  try {
    if (queriesPath) {
      const fs = await import('fs/promises');
      const queries = JSON.parse(await fs.readFile(queriesPath, 'utf-8'));

      for (const [id, query] of Object.entries(queries)) {
        persistedQueries.set(id, query as string);
        queryWhitelist.add(query as string);
      }

      console.log(`Loaded ${persistedQueries.size} persisted queries`);
    }
  } catch (error) {
    console.error('Failed to load persisted queries:', error);
    if (defaultConfig.enforcePersistedQueries) {
      throw new Error('Failed to load required persisted queries');
    }
  }
}

// Query complexity analysis
function createComplexityAnalysis(maxComplexity: number) {
  return createComplexityLimitRule(maxComplexity, {
    maximumComplexity: maxComplexity,
    variables: {},
    onComplete: (complexity: number) => {
      console.log(`Query complexity: ${complexity}`);
    },
    introspection: true,
    scalarCost: 1,
    objectCost: 2,
    listFactor: 10,
    introspectionCost: 1000,
    createError: (max: number, actual: number) => {
      return new GraphQLError(
        `Query complexity ${actual} exceeds maximum allowed complexity ${max}`,
        {
          extensions: {
            code: 'COMPLEXITY_LIMIT_EXCEEDED',
            complexity: actual,
            maxComplexity: max,
          },
        },
      );
    },
  });
}

// Query depth analysis
function createDepthAnalysis(maxDepth: number) {
  return depthLimit(maxDepth, {
    ignore: ['__schema', '__type'],
  });
}

// Cost analysis for resource-intensive operations
function createCostAnalysis(maxCost: number) {
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
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'graphql:rate:',
    }),
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
      return res.status(400).json({
        errors: [
          {
            message: 'Unsupported persisted query version',
            extensions: { code: 'PERSISTED_QUERY_NOT_SUPPORTED' },
          },
        ],
      });
    }

    if (!sha256Hash) {
      return res.status(400).json({
        errors: [
          {
            message: 'Missing persisted query hash',
            extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' },
          },
        ],
      });
    }

    // Try to find the persisted query
    const persistedQueryText = persistedQueries.get(sha256Hash);

    if (!persistedQueryText) {
      if (!query) {
        return res.status(400).json({
          errors: [
            {
              message: 'Persisted query not found',
              extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' },
            },
          ],
        });
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
        return res.status(400).json({
          errors: [
            {
              message: 'Persisted query hash mismatch',
              extensions: { code: 'PERSISTED_QUERY_HASH_MISMATCH' },
            },
          ],
        });
      }
    } else {
      // Use the persisted query
      req.body.query = persistedQueryText;
    }
  }

  // Enforce persisted queries if configured
  if (defaultConfig.enforcePersistedQueries && !persistedQuery) {
    return res.status(400).json({
      errors: [
        {
          message: 'Only persisted queries are allowed',
          extensions: { code: 'PERSISTED_QUERY_REQUIRED' },
        },
      ],
    });
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
      return res.json(result);
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }

  // Store original send to intercept response
  const originalSend = res.json;
  res.json = function (data: any) {
    // Cache successful responses for 5 minutes
    if (data && !data.errors) {
      redisClient
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
      return res.status(403).json({
        errors: [
          {
            message: 'Query not in whitelist',
            extensions: { code: 'QUERY_NOT_WHITELISTED' },
          },
        ],
      });
    }

    next();
  } catch (error) {
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
    const metrics: Partial<QueryMetrics> = {
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
