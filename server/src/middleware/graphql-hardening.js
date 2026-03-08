"use strict";
// @ts-nocheck
/**
 * GraphQL Security and Performance Hardening Middleware
 * Production-grade middleware for IntelGraph Maestro API
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = void 0;
exports.loadPersistedQueries = loadPersistedQueries;
exports.persistedQueriesMiddleware = persistedQueriesMiddleware;
exports.queryCacheMiddleware = queryCacheMiddleware;
exports.securityValidationMiddleware = securityValidationMiddleware;
exports.metricsMiddleware = metricsMiddleware;
exports.createGraphQLHardening = createGraphQLHardening;
const graphql_1 = require("graphql");
const graphql_depth_limit_1 = __importDefault(require("graphql-depth-limit"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = __importDefault(require("crypto"));
const perf_hooks_1 = require("perf_hooks");
const costAnalysisModule = typeof require === 'function'
    ? (() => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require('graphql-cost-analysis');
        }
        catch {
            return null;
        }
    })()
    : null;
const complexityModule = typeof require === 'function'
    ? (() => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require('graphql-query-complexity');
        }
        catch {
            return null;
        }
    })()
    : null;
// Default configuration
const defaultConfig = {
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
const redisClient = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'redis-master',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
});
// Persisted queries store
const persistedQueries = new Map();
// Query whitelist (for high-security environments)
const queryWhitelist = new Set();
// Load persisted queries from file or database
async function loadPersistedQueries(queriesPath) {
    try {
        if (queriesPath) {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const queries = JSON.parse(await fs.readFile(queriesPath, 'utf-8'));
            for (const [id, query] of Object.entries(queries)) {
                persistedQueries.set(id, query);
                queryWhitelist.add(query);
            }
            console.log(`Loaded ${persistedQueries.size} persisted queries`);
        }
    }
    catch (error) {
        console.error('Failed to load persisted queries:', error);
        if (defaultConfig.enforcePersistedQueries) {
            throw new Error('Failed to load required persisted queries');
        }
    }
}
// Query complexity analysis
function createComplexityAnalysis(maxComplexity) {
    const createComplexityLimitRule = complexityModule?.createComplexityLimitRule;
    if (!createComplexityLimitRule) {
        console.warn('graphql-query-complexity not available, skipping complexity rules');
        return (context) => ({
            Document(node) {
                let complexity = 0;
                (0, graphql_1.visit)(node, {
                    Field() {
                        complexity += 1;
                    },
                });
                if (complexity > maxComplexity) {
                    context.reportError(new graphql_1.GraphQLError(`Query complexity ${complexity} exceeds maximum allowed complexity ${maxComplexity}`));
                }
            },
        });
    }
    return createComplexityLimitRule(maxComplexity, {
        maximumComplexity: maxComplexity,
        variables: {},
        onComplete: (complexity) => {
            console.log(`Query complexity: ${complexity}`);
        },
        introspection: true,
        scalarCost: 1,
        objectCost: 2,
        listFactor: 10,
        introspectionCost: 1000,
        createError: (max, actual) => {
            return new graphql_1.GraphQLError(`Query complexity ${actual} exceeds maximum allowed complexity ${max}`, {
                extensions: {
                    code: 'COMPLEXITY_LIMIT_EXCEEDED',
                    complexity: actual,
                    maxComplexity: max,
                },
            });
        },
    });
}
// Query depth analysis
function createDepthAnalysis(maxDepth) {
    const depthLimitRule = typeof graphql_depth_limit_1.default === 'function'
        ? graphql_depth_limit_1.default
        : graphql_depth_limit_1.default?.default;
    if (!depthLimitRule) {
        console.warn('graphql-depth-limit not available, skipping depth rules');
        return (context) => ({
            Document(node) {
                const computeDepth = (selectionSet, depth = 0) => {
                    if (!selectionSet?.selections?.length)
                        return depth;
                    return Math.max(...selectionSet.selections.map((selection) => {
                        if (selection.selectionSet) {
                            return computeDepth(selection.selectionSet, depth + 1);
                        }
                        return depth + 1;
                    }));
                };
                let maxObservedDepth = 0;
                (0, graphql_1.visit)(node, {
                    OperationDefinition(operation) {
                        maxObservedDepth = Math.max(maxObservedDepth, computeDepth(operation.selectionSet, 0));
                    },
                });
                if (maxObservedDepth > maxDepth) {
                    context.reportError(new graphql_1.GraphQLError(`Query depth ${maxObservedDepth} exceeds maximum allowed depth ${maxDepth}`));
                }
            },
        });
    }
    return depthLimitRule(maxDepth, {
        ignore: ['__schema', '__type'],
    });
}
// Cost analysis for resource-intensive operations
function createCostAnalysis(maxCost) {
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
        onComplete: (cost) => {
            console.log(`Query cost: ${cost}`);
        },
    });
}
// Query sanitization and validation
function sanitizeQuery(query) {
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
            throw new graphql_1.GraphQLError('Query contains suspicious patterns', {
                extensions: { code: 'QUERY_REJECTED', reason: 'suspicious_pattern' },
            });
        }
    }
    return query;
}
// Rate limiting middleware
const createRateLimiter = (config) => {
    let store;
    try {
        store = new rate_limit_redis_1.default({
            client: redisClient,
            prefix: 'graphql:rate:',
        });
    }
    catch (error) {
        console.warn('rate-limit-redis unavailable, falling back to in-memory store', error?.message || error);
    }
    return (0, express_rate_limit_1.default)({
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
            const user = req.user;
            if (user?.id) {
                return `user:${user.id}`;
            }
            return `ip:${req.ip}`;
        },
        skipSuccessfulRequests: config.skipSuccessfulRequests,
    });
};
exports.createRateLimiter = createRateLimiter;
// Persisted queries middleware
function persistedQueriesMiddleware(req, res, next) {
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
            const computedHash = crypto_1.default
                .createHash('sha256')
                .update(query)
                .digest('hex');
            if (computedHash === sha256Hash) {
                persistedQueries.set(sha256Hash, query);
                console.log(`Registered new persisted query: ${sha256Hash}`);
            }
            else {
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
        }
        else {
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
async function queryCacheMiddleware(req, res, next) {
    if (req.method !== 'POST' || !req.body?.query) {
        return next();
    }
    const { query, variables } = req.body;
    const user = req.user;
    // Only cache read operations
    if (query.trim().toLowerCase().startsWith('mutation') ||
        query.trim().toLowerCase().startsWith('subscription')) {
        return next();
    }
    // Create cache key
    const cacheKey = crypto_1.default
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
    }
    catch (error) {
        console.warn('Cache read error:', error);
    }
    // Store original send to intercept response
    const originalSend = res.json;
    res.json = function (data) {
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
function securityValidationMiddleware(req, res, next) {
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
    }
    catch (error) {
        res.status(400).json({
            errors: [
                {
                    message: error instanceof Error ? error.message : 'Query validation failed',
                    extensions: { code: 'INVALID_QUERY' },
                },
            ],
        });
    }
}
// Metrics collection middleware
function metricsMiddleware(req, res, next) {
    const startTime = perf_hooks_1.performance.now();
    const originalSend = res.json;
    res.json = function (data) {
        const duration = perf_hooks_1.performance.now() - startTime;
        // Collect metrics
        const metrics = {
            duration,
            cached: data?.extensions?.cached || false,
            userId: req.user?.id,
            organizationId: req.user?.organization_id,
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
function createGraphQLHardening(config = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    // Create validation rules
    const validationRules = [
        ...graphql_1.specifiedRules,
        createDepthAnalysis(finalConfig.maxDepth),
        createComplexityAnalysis(finalConfig.maxComplexity),
        createCostAnalysis(finalConfig.maxCost),
    ];
    return {
        rateLimiter: (0, exports.createRateLimiter)(finalConfig.rateLimit),
        persistedQueries: persistedQueriesMiddleware,
        queryCache: queryCacheMiddleware,
        securityValidation: securityValidationMiddleware,
        metrics: metricsMiddleware,
        validationRules,
        config: finalConfig,
    };
}
// Export default hardening setup
exports.default = createGraphQLHardening();
