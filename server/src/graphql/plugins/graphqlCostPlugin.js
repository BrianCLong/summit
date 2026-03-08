"use strict";
// @ts-nocheck
/**
 * GraphQL Cost Analysis Plugin with Dynamic Rate Limiting
 * Enforces query cost limits with per-tenant, multi-tier rate limiting
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraphQLCostPlugin = createGraphQLCostPlugin;
exports.createProductionGraphQLCostPlugin = createProductionGraphQLCostPlugin;
const graphql_1 = require("graphql");
const pino_1 = __importDefault(require("pino"));
const CostCalculator_js_1 = require("../services/CostCalculator.js");
const TenantRateLimitService_js_1 = require("../services/TenantRateLimitService.js");
const metrics_js_1 = require("../../monitoring/metrics.js");
const node_crypto_1 = __importDefault(require("node:crypto"));
const logger = pino_1.default();
/**
 * Creates a GraphQL cost analysis and rate limiting plugin
 */
function createGraphQLCostPlugin(options = {}) {
    const { enforceLimits = process.env.ENFORCE_GRAPHQL_COST_LIMITS !== 'false', logCosts = true, logOverages = true, exemptOperations = ['health', 'version', '__schema', 'IntrospectionQuery'], exemptTenants = [], } = options;
    return {
        async requestDidStart() {
            let queryCost = 0;
            let querySignature = null;
            return {
                async didResolveOperation({ request, document, schema, contextValue, operation }) {
                    const operationName = request.operationName || operation?.name?.value || 'anonymous';
                    const operationType = operation?.operation || 'query';
                    // Skip exempt operations
                    if (exemptOperations.includes(operationName)) {
                        return;
                    }
                    // Extract tenant context
                    const tenantId = contextValue?.user?.tenantId || 'default';
                    const userId = contextValue?.user?.id;
                    const tier = contextValue?.user?.tier || 'free';
                    // Skip exempt tenants
                    if (exemptTenants.includes(tenantId)) {
                        logger.debug({ tenantId, operationName }, 'Skipping cost check for exempt tenant');
                        return;
                    }
                    try {
                        // 1. Calculate query cost
                        const costCalculator = await (0, CostCalculator_js_1.getCostCalculator)();
                        queryCost = costCalculator.calculateCost(schema, document, request.variables || {});
                        // Generate query signature for logging (hash of query structure)
                        const queryText = request.query || '';
                        querySignature = {
                            operationName,
                            operationType,
                            signature: node_crypto_1.default.createHash('sha256').update(queryText).digest('hex').slice(0, 16),
                        };
                        // Log query cost
                        if (logCosts) {
                            logger.info({
                                operationName,
                                operationType,
                                tenantId,
                                userId,
                                cost: queryCost,
                                signature: querySignature.signature,
                            }, 'GraphQL query cost calculated');
                        }
                        // Record cost histogram metric
                        metrics_js_1.graphqlQueryCostHistogram
                            .labels(tenantId, operationName, operationType)
                            .observe(queryCost);
                        // 2. Check rate limits
                        const rateLimitService = (0, TenantRateLimitService_js_1.getTenantRateLimitService)();
                        const limitResult = await rateLimitService.checkLimit({
                            tenantId,
                            userId,
                            tier,
                            cost: queryCost,
                            operationName,
                        });
                        // Record tenant cost usage
                        if (limitResult.allowed) {
                            metrics_js_1.graphqlTenantCostUsage.labels(tenantId, tier, userId || 'anonymous').inc(queryCost);
                            // Update remaining capacity gauge
                            metrics_js_1.graphqlCostLimitRemaining
                                .labels(tenantId, tier)
                                .set(limitResult.remaining.perMinute);
                        }
                        // 3. Handle over-limit queries
                        if (!limitResult.allowed) {
                            // Record metrics
                            metrics_js_1.graphqlCostLimitExceededTotal
                                .labels(tenantId, limitResult.reason || 'UNKNOWN', tier)
                                .inc();
                            metrics_js_1.graphqlPerTenantOverageCount.labels(tenantId, tier).inc();
                            metrics_js_1.graphqlCostRateLimitHits
                                .labels(tenantId, this.getLimitType(limitResult.reason), tier)
                                .inc();
                            // Log overage event
                            if (logOverages) {
                                logger.warn({
                                    tenantId,
                                    userId,
                                    tier,
                                    operationName,
                                    operationType,
                                    cost: queryCost,
                                    reason: limitResult.reason,
                                    limits: limitResult.limits,
                                    remaining: limitResult.remaining,
                                    signature: querySignature.signature,
                                    query: request.query?.slice(0, 500), // Sampled query (first 500 chars)
                                }, 'GraphQL query rejected: cost limit exceeded');
                            }
                            // Throw error if enforcement is enabled
                            if (enforceLimits) {
                                throw new graphql_1.GraphQLError(this.buildErrorMessage(limitResult), {
                                    extensions: {
                                        code: 'GRAPHQL_COST_LIMIT_EXCEEDED',
                                        cost: queryCost,
                                        limit: limitResult.limits.perQuery,
                                        remaining: limitResult.remaining.perMinute,
                                        reset: limitResult.reset.perMinute,
                                        resetHint: new Date(limitResult.reset.perMinute).toISOString(),
                                        retryAfter: limitResult.retryAfter,
                                        reason: limitResult.reason,
                                        tier,
                                        limits: {
                                            perQuery: limitResult.limits.perQuery,
                                            perMinute: limitResult.limits.perMinute,
                                            perHour: limitResult.limits.perHour,
                                        },
                                    },
                                });
                            }
                            else {
                                // Warn mode: log but allow execution
                                logger.warn({
                                    tenantId,
                                    operationName,
                                    cost: queryCost,
                                    reason: limitResult.reason,
                                }, 'Cost limit exceeded but enforcement is disabled (warn mode)');
                            }
                        }
                    }
                    catch (error) {
                        // If error is already a GraphQLError (limit exceeded), rethrow it
                        if (error instanceof graphql_1.GraphQLError) {
                            throw error;
                        }
                        // Log other errors but don't block the request (fail open)
                        logger.error({ error, tenantId, operationName }, 'Error in cost analysis plugin');
                    }
                },
            };
        },
        /**
         * Get human-readable limit type from reason code
         */
        getLimitType(reason) {
            switch (reason) {
                case 'QUERY_TOO_EXPENSIVE':
                    return 'per_query';
                case 'TENANT_RATE_LIMIT_EXCEEDED':
                    return 'per_minute';
                case 'TENANT_HOURLY_LIMIT_EXCEEDED':
                    return 'per_hour';
                case 'USER_RATE_LIMIT_EXCEEDED':
                    return 'per_user';
                default:
                    return 'unknown';
            }
        },
        /**
         * Build user-friendly error message
         */
        buildErrorMessage(limitResult) {
            const { reason, cost, limits, remaining, retryAfter } = limitResult;
            switch (reason) {
                case 'QUERY_TOO_EXPENSIVE':
                    return (`Query is too expensive (cost: ${cost}). ` +
                        `Maximum cost per query is ${limits.perQuery}. ` +
                        `Please simplify your query or reduce the number of fields requested.`);
                case 'TENANT_RATE_LIMIT_EXCEEDED':
                    return (`Rate limit exceeded for your organization (cost: ${cost}). ` +
                        `You have used your per-minute quota of ${limits.perMinute} cost points. ` +
                        `Remaining capacity: ${remaining.perMinute}. ` +
                        `Retry after ${retryAfter || 60} seconds.`);
                case 'TENANT_HOURLY_LIMIT_EXCEEDED':
                    return (`Hourly rate limit exceeded for your organization (cost: ${cost}). ` +
                        `You have used your hourly quota of ${limits.perHour} cost points. ` +
                        `Remaining capacity: ${remaining.perHour}. ` +
                        `Retry after ${retryAfter || 3600} seconds.`);
                case 'USER_RATE_LIMIT_EXCEEDED':
                    return (`Personal rate limit exceeded (cost: ${cost}). ` +
                        `You have exceeded your individual quota within your organization. ` +
                        `Retry after ${retryAfter || 60} seconds.`);
                default:
                    return (`Query rejected due to cost limits (cost: ${cost}). ` +
                        `Please try again later or contact support for assistance.`);
            }
        },
    };
}
/**
 * Create plugin with default production configuration
 */
function createProductionGraphQLCostPlugin() {
    return createGraphQLCostPlugin({
        enforceLimits: process.env.NODE_ENV === 'production',
        logCosts: true,
        logOverages: true,
        exemptOperations: ['health', 'version', '__schema', 'IntrospectionQuery'],
        exemptTenants: process.env.COST_EXEMPT_TENANTS?.split(',') || [],
    });
}
