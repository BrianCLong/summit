"use strict";
/**
 * GraphQL Rate Limit Plugin
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraphQLRateLimitPlugin = createGraphQLRateLimitPlugin;
exports.createFieldRateLimitDirective = createFieldRateLimitDirective;
const pino_1 = __importDefault(require("pino"));
const graphql_1 = require("graphql");
const logger = (0, pino_1.default)();
/**
 * Calculate query complexity (simple heuristic)
 */
function calculateComplexity(query) {
    // Simple complexity calculation based on:
    // - Number of fields
    // - Nesting depth
    // - Fragments
    const fieldMatches = query.match(/\w+\s*[({]/g) || [];
    const fields = fieldMatches.length;
    const braceDepth = calculateBraceDepth(query);
    const fragmentCount = (query.match(/\.\.\.on\s+\w+/g) || []).length;
    return fields + (braceDepth * 10) + (fragmentCount * 5);
}
/**
 * Calculate maximum nesting depth
 */
function calculateBraceDepth(query) {
    let depth = 0;
    let maxDepth = 0;
    for (const char of query) {
        if (char === '{') {
            depth++;
            maxDepth = Math.max(maxDepth, depth);
        }
        else if (char === '}') {
            depth--;
        }
    }
    return maxDepth;
}
/**
 * Extract identifier from GraphQL context
 */
function extractIdentifier(context) {
    if (context.user?.id) {
        return `user:${context.user.id}`;
    }
    if (context.tenant?.id) {
        return `tenant:${context.tenant.id}`;
    }
    if (context.req?.ip) {
        return `ip:${context.req.ip}`;
    }
    return 'anonymous';
}
/**
 * Extract tier from GraphQL context
 */
function extractTier(context) {
    return context.user?.tier || context.tenant?.plan || context.tenant?.tier;
}
/**
 * Create GraphQL rate limit plugin
 */
function createGraphQLRateLimitPlugin(rateLimiter, options = {}) {
    const maxComplexity = options.maxComplexity || 1000;
    const endpoint = '/graphql';
    return {
        async requestDidStart(requestContext) {
            const startTime = Date.now();
            return {
                async didResolveOperation(operationContext) {
                    try {
                        const { request, contextValue } = operationContext;
                        // Extract identifier and tier
                        const identifier = extractIdentifier(contextValue);
                        const tier = extractTier(contextValue);
                        // Check rate limit
                        const state = await rateLimiter.check(identifier, endpoint, tier);
                        // Set headers on HTTP response if available
                        if (contextValue.res) {
                            contextValue.res.setHeader('X-RateLimit-Limit', state.limit.toString());
                            contextValue.res.setHeader('X-RateLimit-Remaining', state.remaining.toString());
                            contextValue.res.setHeader('X-RateLimit-Reset', state.resetAt.toString());
                            if (state.isExceeded && state.retryAfter > 0) {
                                contextValue.res.setHeader('Retry-After', state.retryAfter.toString());
                            }
                        }
                        // Throw error if rate limit exceeded
                        if (state.isExceeded) {
                            logger.warn({
                                message: 'GraphQL rate limit exceeded',
                                identifier,
                                tier,
                                operation: request.operationName,
                                consumed: state.consumed,
                                limit: state.limit,
                            });
                            throw new graphql_1.GraphQLError('Rate limit exceeded. Please try again later.', {
                                extensions: {
                                    code: 'RATE_LIMIT_EXCEEDED',
                                    retryAfter: state.retryAfter,
                                    limit: state.limit,
                                    remaining: 0,
                                    resetAt: new Date(state.resetAt * 1000).toISOString(),
                                },
                            });
                        }
                        // Check query complexity if enabled
                        if (maxComplexity > 0 && request.query) {
                            const complexity = calculateComplexity(request.query);
                            if (complexity > maxComplexity) {
                                logger.warn({
                                    message: 'GraphQL query too complex',
                                    identifier,
                                    tier,
                                    operation: request.operationName,
                                    complexity,
                                    maxComplexity,
                                });
                                throw new graphql_1.GraphQLError('Query is too complex. Please simplify your query.', {
                                    extensions: {
                                        code: 'QUERY_TOO_COMPLEX',
                                        complexity,
                                        maxComplexity,
                                    },
                                });
                            }
                        }
                    }
                    catch (error) {
                        // Re-throw GraphQL errors
                        if (error instanceof graphql_1.GraphQLError) {
                            throw error;
                        }
                        // Log other errors but don't block request (fail open)
                        logger.error({
                            message: 'GraphQL rate limit plugin error',
                            error: error instanceof Error ? error.message : String(error),
                        });
                    }
                },
                async willSendResponse(responseContext) {
                    const duration = Date.now() - startTime;
                    // Log slow queries
                    if (duration > 1000) {
                        logger.warn({
                            message: 'Slow GraphQL query',
                            operation: responseContext.request.operationName,
                            duration,
                        });
                    }
                },
            };
        },
    };
}
/**
 * Directive-based rate limiting for specific fields
 * Usage: type Query { expensiveField: String @rateLimit(limit: 10, window: 60) }
 */
function createFieldRateLimitDirective(rateLimiter) {
    return {
        name: 'rateLimit',
        visitFieldDefinition(field, details) {
            const { resolve = defaultFieldResolver } = field;
            const { limit = 100, window = 60 } = details.args;
            field.resolve = async function (source, args, context, info) {
                const identifier = extractIdentifier(context);
                const tier = extractTier(context);
                const endpoint = `graphql:${info.parentType.name}.${info.fieldName}`;
                // Check rate limit for this specific field
                const state = await rateLimiter.check(identifier, endpoint, tier);
                if (state.isExceeded) {
                    throw new graphql_1.GraphQLError(`Rate limit exceeded for ${info.fieldName}. Please try again later.`, {
                        extensions: {
                            code: 'FIELD_RATE_LIMIT_EXCEEDED',
                            field: info.fieldName,
                            retryAfter: state.retryAfter,
                        },
                    });
                }
                return resolve.apply(this, [source, args, context, info]);
            };
        },
    };
}
// Default field resolver fallback
const defaultFieldResolver = (source, args, context, info) => {
    return source?.[info.fieldName];
};
