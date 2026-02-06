/**
 * GraphQL Cost Analysis Plugin with Dynamic Rate Limiting
 * Enforces query cost limits with per-tenant, multi-tier rate limiting
 */

import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLError } from 'graphql';
import pino from 'pino';
import type { GraphQLContext } from '../index.js';
import { getCostCalculator } from '../services/CostCalculator.js';
import {
  getTenantRateLimitService,
  type TenantRateLimitResult,
} from '../services/TenantRateLimitService.js';
import {
  graphqlQueryCostHistogram,
  graphqlCostLimitExceededTotal,
  graphqlCostLimitRemaining,
  graphqlTenantCostUsage,
  graphqlCostRateLimitHits,
  graphqlPerTenantOverageCount,
} from '../../monitoring/metrics.js';
import crypto from 'node:crypto';

const logger = (pino as any).default ? (pino as any).default() : (pino as any)();

export interface GraphQLCostPluginOptions {
  /**
   * Whether to enforce cost limits
   * @default true in production
   */
  enforceLimits?: boolean;

  /**
   * Whether to log all query costs for monitoring
   * @default true
   */
  logCosts?: boolean;

  /**
   * Whether to log over-limit events
   * @default true
   */
  logOverages?: boolean;

  /**
   * Operations exempt from cost checking (e.g., health checks)
   */
  exemptOperations?: string[];

  /**
   * Tenants exempt from cost checking (e.g., internal testing)
   */
  exemptTenants?: string[];
}

interface QuerySignature {
  operationName: string;
  operationType: string;
  signature: string;
}

/**
 * Creates a GraphQL cost analysis and rate limiting plugin
 */
export function createGraphQLCostPlugin(
  options: GraphQLCostPluginOptions = {}
): ApolloServerPlugin<GraphQLContext> {
  const {
    enforceLimits = process.env.ENFORCE_GRAPHQL_COST_LIMITS !== 'false',
    logCosts = true,
    logOverages = true,
    exemptOperations = ['health', 'version', '__schema', 'IntrospectionQuery'],
    exemptTenants = [],
  } = options;

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<GraphQLContext>> {
      let queryCost = 0;
      let querySignature: QuerySignature | null = null;

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
          const tier = (contextValue?.user as any)?.tier || 'free';

          // Skip exempt tenants
          if (exemptTenants.includes(tenantId)) {
            logger.debug({ tenantId, operationName }, 'Skipping cost check for exempt tenant');
            return;
          }

          try {
            // 1. Calculate query cost
            const costCalculator = await getCostCalculator();
            queryCost = costCalculator.calculateCost(schema, document, request.variables || {});

            // Generate query signature for logging (hash of query structure)
            const queryText = request.query || '';
            querySignature = {
              operationName,
              operationType,
              signature: crypto.createHash('sha256').update(queryText).digest('hex').slice(0, 16),
            };

            // Log query cost
            if (logCosts) {
              logger.info(
                {
                  operationName,
                  operationType,
                  tenantId,
                  userId,
                  cost: queryCost,
                  signature: querySignature.signature,
                },
                'GraphQL query cost calculated'
              );
            }

            // Record cost histogram metric
            graphqlQueryCostHistogram
              .labels(tenantId, operationName, operationType)
              .observe(queryCost);

            // 2. Check rate limits
            const rateLimitService = getTenantRateLimitService();
            const limitResult: TenantRateLimitResult = await rateLimitService.checkLimit({
              tenantId,
              userId,
              tier,
              cost: queryCost,
              operationName,
            });

            // Record tenant cost usage
            if (limitResult.allowed) {
              graphqlTenantCostUsage.labels(tenantId, tier, userId || 'anonymous').inc(queryCost);

              // Update remaining capacity gauge
              graphqlCostLimitRemaining
                .labels(tenantId, tier)
                .set(limitResult.remaining.perMinute);
            }

            // 3. Handle over-limit queries
            if (!limitResult.allowed) {
              // Record metrics
              graphqlCostLimitExceededTotal
                .labels(tenantId, limitResult.reason || 'UNKNOWN', tier)
                .inc();

              graphqlPerTenantOverageCount.labels(tenantId, tier).inc();

              graphqlCostRateLimitHits
                .labels(tenantId, this.getLimitType(limitResult.reason), tier)
                .inc();

              // Log overage event
              if (logOverages) {
                logger.warn(
                  {
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
                  },
                  'GraphQL query rejected: cost limit exceeded'
                );
              }

              // Throw error if enforcement is enabled
              if (enforceLimits) {
                throw new GraphQLError(this.buildErrorMessage(limitResult), {
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
              } else {
                // Warn mode: log but allow execution
                logger.warn(
                  {
                    tenantId,
                    operationName,
                    cost: queryCost,
                    reason: limitResult.reason,
                  },
                  'Cost limit exceeded but enforcement is disabled (warn mode)'
                );
              }
            }
          } catch (error: any) {
            // If error is already a GraphQLError (limit exceeded), rethrow it
            if (error instanceof GraphQLError) {
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
    getLimitType(reason?: string): string {
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
    buildErrorMessage(limitResult: TenantRateLimitResult): string {
      const { reason, cost, limits, remaining, retryAfter } = limitResult;

      switch (reason) {
        case 'QUERY_TOO_EXPENSIVE':
          return (
            `Query is too expensive (cost: ${cost}). ` +
            `Maximum cost per query is ${limits.perQuery}. ` +
            `Please simplify your query or reduce the number of fields requested.`
          );

        case 'TENANT_RATE_LIMIT_EXCEEDED':
          return (
            `Rate limit exceeded for your organization (cost: ${cost}). ` +
            `You have used your per-minute quota of ${limits.perMinute} cost points. ` +
            `Remaining capacity: ${remaining.perMinute}. ` +
            `Retry after ${retryAfter || 60} seconds.`
          );

        case 'TENANT_HOURLY_LIMIT_EXCEEDED':
          return (
            `Hourly rate limit exceeded for your organization (cost: ${cost}). ` +
            `You have used your hourly quota of ${limits.perHour} cost points. ` +
            `Remaining capacity: ${remaining.perHour}. ` +
            `Retry after ${retryAfter || 3600} seconds.`
          );

        case 'USER_RATE_LIMIT_EXCEEDED':
          return (
            `Personal rate limit exceeded (cost: ${cost}). ` +
            `You have exceeded your individual quota within your organization. ` +
            `Retry after ${retryAfter || 60} seconds.`
          );

        default:
          return (
            `Query rejected due to cost limits (cost: ${cost}). ` +
            `Please try again later or contact support for assistance.`
          );
      }
    },
  };
}

/**
 * Create plugin with default production configuration
 */
export function createProductionGraphQLCostPlugin(): ApolloServerPlugin<GraphQLContext> {
  return createGraphQLCostPlugin({
    enforceLimits: process.env.NODE_ENV === 'production' || process.env.ENFORCE_COST_LIMITS === 'true',
    logCosts: true,
    logOverages: true,
    exemptOperations: ['health', 'version', '__schema', 'IntrospectionQuery'],
    exemptTenants: process.env.COST_EXEMPT_TENANTS?.split(',') || [],
  });
}
