/**
 * Query Complexity Plugin for Apollo Server
 * Analyzes GraphQL queries and rejects queries that exceed complexity limits
 * Prevents expensive queries from overwhelming the server
 */

import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { getComplexity, simpleEstimator, fieldExtensionsEstimator } from 'graphql-query-complexity';
import { GraphQLError } from 'graphql';
import pino from 'pino';

const logger = pino();

export interface QueryComplexityOptions {
  /**
   * Maximum allowed query complexity
   * @default 1000
   */
  maximumComplexity?: number;

  /**
   * Whether to log query complexity for all queries
   * @default true in development, false in production
   */
  logComplexity?: boolean;

  /**
   * Function to dynamically adjust max complexity based on user role
   */
  getMaxComplexityForUser?: (context: any) => number;

  /**
   * Whether to enforce complexity limits
   * @default false in development, true in production
   */
  enforceComplexity?: boolean;
}

const DEFAULT_MAX_COMPLEXITY = 1000;

/**
 * Creates a query complexity analysis plugin
 */
export function createQueryComplexityPlugin(
  options: QueryComplexityOptions = {}
): ApolloServerPlugin {
  const {
    maximumComplexity = DEFAULT_MAX_COMPLEXITY,
    logComplexity = process.env.NODE_ENV !== 'production',
    getMaxComplexityForUser,
    enforceComplexity = process.env.NODE_ENV === 'production',
  } = options;

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
      return {
        async didResolveOperation({ request, document, schema, contextValue }) {
          try {
            const complexity = getComplexity({
              schema,
              query: document,
              variables: request.variables || {},
              estimators: [
                // Use field extensions for custom complexity (@complexity directive)
                fieldExtensionsEstimator(),
                // Fall back to simple estimator (1 per field)
                simpleEstimator({ defaultComplexity: 1 }),
              ],
            });

            // Determine max complexity for this request
            let maxComplexity = maximumComplexity;
            if (getMaxComplexityForUser && contextValue?.user) {
              maxComplexity = getMaxComplexityForUser(contextValue);
            }

            // Log complexity for monitoring
            if (logComplexity) {
              logger.info(
                {
                  operationName: request.operationName,
                  complexity,
                  maxComplexity,
                  user: contextValue?.user?.id,
                  query: request.query?.substring(0, 200), // First 200 chars
                },
                'GraphQL query complexity analyzed'
              );
            }

            // Enforce complexity limit
            if (enforceComplexity && complexity > maxComplexity) {
              logger.warn(
                {
                  operationName: request.operationName,
                  complexity,
                  maxComplexity,
                  user: contextValue?.user?.id,
                },
                'Query exceeded complexity limit'
              );

              throw new GraphQLError(
                `Query is too complex: ${complexity}. Maximum allowed complexity: ${maxComplexity}`,
                {
                  extensions: {
                    code: 'QUERY_TOO_COMPLEX',
                    complexity,
                    maximumComplexity: maxComplexity,
                  },
                }
              );
            }
          } catch (error) {
            // If error is already a GraphQLError, rethrow it
            if (error instanceof GraphQLError) {
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
 * Can be customized per application needs
 */
export function getMaxComplexityByRole(context: any): number {
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
export const FIELD_COMPLEXITY_ESTIMATORS = {
  // List fields multiply by the limit argument
  list: (args: any) => {
    const limit = args.limit || 25;
    return limit;
  },

  // Paginated fields
  paginated: (args: any) => {
    const limit = args.limit || args.first || 25;
    return Math.min(limit, 100);
  },

  // Search queries are more expensive
  search: (args: any) => {
    const limit = args.limit || 25;
    return limit * 2; // Double the cost for search
  },

  // Graph traversal queries
  graph: (args: any) => {
    const depth = args.depth || 1;
    const limit = args.limit || 25;
    return Math.pow(limit, depth); // Exponential cost for depth
  },

  // Aggregation queries
  aggregation: (args: any) => {
    return 50; // Fixed higher cost for aggregations
  },
};
