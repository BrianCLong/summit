import { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError } from 'graphql';
import gqc from 'graphql-query-complexity';
const { getComplexity, simpleEstimator, fieldExtensionsEstimator } = (gqc as any).default || gqc;
import pino from 'pino';
import type { GraphQLSchema } from 'graphql';
import type { GraphQLContext } from '../index.js';

const logger = (pino as any).default ? (pino as any).default() : (pino as any)();

export const rateLimitAndCachePlugin = (schema: GraphQLSchema): ApolloServerPlugin<GraphQLContext> => {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation({ request, document }) {
          /**
           * Complexity Analysis
           */
          const complexity = getComplexity({
            schema,
            operationName: request.operationName,
            query: document,
            variables: request.variables,
            estimators: [
              fieldExtensionsEstimator(),
              simpleEstimator({ defaultComplexity: 1 }),
            ],
          });

          // Hard limit for complexity
          const MAX_COMPLEXITY = 1000;
          if (complexity > MAX_COMPLEXITY) {
            throw new GraphQLError(`Query is too complex: ${complexity}. Maximum allowed is ${MAX_COMPLEXITY}.`, {
              extensions: {
                code: 'QUERY_TOO_COMPLEX',
              }
            });
          }
        },

        async willSendResponse({ request, response }) {
          // We could cache whole responses here if we can generate a stable key
          // For now, we rely on resolver-level caching via CacheService for granularity
        }
      };
    },
  };
};
