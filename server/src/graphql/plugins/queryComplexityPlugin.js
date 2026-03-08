"use strict";
// @ts-nocheck
/**
 * Query Complexity Plugin for Apollo Server
 * Analyzes GraphQL queries and rejects queries that exceed complexity limits
 * Prevents expensive queries from overwhelming the server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIELD_COMPLEXITY_ESTIMATORS = void 0;
exports.createQueryComplexityPlugin = createQueryComplexityPlugin;
exports.getMaxComplexityByRole = getMaxComplexityByRole;
const graphql_query_complexity_1 = require("graphql-query-complexity");
const graphql_1 = require("graphql");
const pino_1 = __importDefault(require("pino"));
const RateLimiter_js_1 = require("../../services/RateLimiter.js");
const config_js_1 = require("../../config.js");
const logger = pino_1.default();
const DEFAULT_MAX_COMPLEXITY = 1000;
/**
 * Creates a query complexity analysis plugin
 */
function createQueryComplexityPlugin(options = {}) {
    const { maximumComplexity = DEFAULT_MAX_COMPLEXITY, logComplexity = process.env.NODE_ENV !== 'production', getMaxComplexityForUser, enforceComplexity = process.env.NODE_ENV === 'production', enforceCostLimit = true, } = options;
    return {
        async requestDidStart() {
            return {
                async didResolveOperation({ request, document, schema, contextValue }) {
                    try {
                        const complexity = (0, graphql_query_complexity_1.getComplexity)({
                            schema,
                            query: document,
                            variables: request.variables || {},
                            estimators: [
                                // Use field extensions for custom complexity (@complexity directive)
                                (0, graphql_query_complexity_1.fieldExtensionsEstimator)(),
                                // Fall back to simple estimator (1 per field)
                                (0, graphql_query_complexity_1.simpleEstimator)({ defaultComplexity: 1 }),
                            ],
                        });
                        // Determine max complexity for this request
                        let maxComplexity = maximumComplexity;
                        if (getMaxComplexityForUser && contextValue?.user) {
                            maxComplexity = getMaxComplexityForUser(contextValue);
                        }
                        // Log complexity for monitoring
                        if (logComplexity) {
                            logger.info({
                                operationName: request.operationName,
                                complexity,
                                maxComplexity,
                                user: contextValue?.user?.id,
                            }, 'GraphQL query complexity analyzed');
                        }
                        // 1. Hard complexity limit (Single Request)
                        if (enforceComplexity && complexity > maxComplexity) {
                            logger.warn({
                                operationName: request.operationName,
                                complexity,
                                maxComplexity,
                                user: contextValue?.user?.id,
                            }, 'Query exceeded complexity limit');
                            throw new graphql_1.GraphQLError(`Query is too complex: ${complexity}. Maximum allowed complexity: ${maxComplexity}`, {
                                extensions: {
                                    code: 'QUERY_TOO_COMPLEX',
                                    complexity,
                                    maximumComplexity: maxComplexity,
                                },
                            });
                        }
                        // 2. Cost-based Rate Limiting (Over Time)
                        if (enforceCostLimit) {
                            const user = contextValue?.user;
                            let key;
                            let limit;
                            // Use configured rate limit window or default to 1 minute
                            const windowMs = config_js_1.cfg.RATE_LIMIT_WINDOW_MS || 60000;
                            if (user) {
                                key = `cost:user:${user.id || user.sub}`;
                                // Allow e.g. 50,000 complexity points per window for auth users
                                // This is separate from request count limit
                                limit = config_js_1.cfg.RATE_LIMIT_MAX_COMPLEXITY_AUTHENTICATED || 50000;
                            }
                            else {
                                key = `cost:ip:${contextValue?.request?.ip || 'unknown'}`;
                                limit = config_js_1.cfg.RATE_LIMIT_MAX_COMPLEXITY_ANONYMOUS || 5000;
                            }
                            // Use rateLimiter.consume if available
                            if (RateLimiter_js_1.rateLimiter && typeof RateLimiter_js_1.rateLimiter.consume === 'function') {
                                const result = await RateLimiter_js_1.rateLimiter.consume(key, complexity, limit, windowMs);
                                if (!result.allowed) {
                                    logger.warn({ key, complexity, limit, remaining: result.remaining }, 'Query exceeded complexity rate limit');
                                    throw new graphql_1.GraphQLError(`Rate limit exceeded for query complexity. Try again in ${Math.ceil((result.reset - Date.now()) / 1000)}s`, {
                                        extensions: {
                                            code: 'COMPLEXITY_RATE_LIMIT_EXCEEDED',
                                            retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
                                        },
                                    });
                                }
                            }
                        }
                    }
                    catch (error) {
                        // If error is already a GraphQLError, rethrow it
                        if (error instanceof graphql_1.GraphQLError) {
                            throw error;
                        }
                        // Log other errors but don't block the request
                        logger.error({ error }, 'Error calculating query complexity');
                    }
                },
            };
        },
    };
}
/**
 * Helper function to get max complexity based on user role
 */
function getMaxComplexityByRole(context) {
    const user = context?.user;
    if (!user) {
        return 100; // Unauthenticated users get lower limit
    }
    // Adjust complexity limits based on user role
    const role = user.roles?.[0] || user.role;
    switch (role) {
        case 'admin':
        case 'superuser':
            return 5000; // Admins can run more complex queries
        case 'analyst':
        case 'investigator':
            return 2000; // Analysts get moderate limits
        case 'viewer':
        case 'guest':
            return 500; // Viewers get lower limits
        default:
            return DEFAULT_MAX_COMPLEXITY;
    }
}
/**
 * Field complexity estimator for common patterns
 * Use with @complexity directive in schema
 */
exports.FIELD_COMPLEXITY_ESTIMATORS = {
    // List fields multiply by the limit argument
    list: (args) => {
        const limit = args.limit || 25;
        return limit;
    },
    // Paginated fields
    paginated: (args) => {
        const limit = args.limit || args.first || 25;
        return Math.min(limit, 100);
    },
    // Search queries are more expensive
    search: (args) => {
        const limit = args.limit || 25;
        return limit * 2; // Double the cost for search
    },
    // Graph traversal queries
    graph: (args) => {
        const depth = args.depth || 1;
        const limit = args.limit || 25;
        return Math.pow(limit, depth); // Exponential cost for depth
    },
    // Aggregation queries
    aggregation: (args) => {
        return 50; // Fixed higher cost for aggregations
    },
};
