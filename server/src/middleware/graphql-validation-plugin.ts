/**
 * GraphQL Validation and Security Plugin
 *
 * This Apollo Server plugin provides comprehensive input validation,
 * query complexity analysis, and security checks for all GraphQL operations.
 *
 * Features:
 * - Query depth and complexity limits
 * - Input sanitization
 * - Rate limiting integration
 * - Audit logging
 * - Performance monitoring
 */

import { ApolloServerPlugin, GraphQLRequestContext, GraphQLRequestListener } from '@apollo/server';
import { GraphQLError } from 'graphql';
import {
  SanitizationUtils,
  SecurityValidator,
  GraphQLInputSchema,
  validateInput,
} from '../validation/index.js';
import pino from 'pino';

const logger = pino();

interface ValidationPluginOptions {
  maxDepth?: number;
  maxComplexity?: number;
  enableSanitization?: boolean;
  enableAuditLog?: boolean;
  rateLimit?: {
    maxOperationsPerMinute: number;
    keyGenerator: (context: any) => string;
  };
}

const defaultOptions: Required<ValidationPluginOptions> = {
  maxDepth: 15,
  maxComplexity: 1000,
  enableSanitization: true,
  enableAuditLog: true,
  rateLimit: {
    maxOperationsPerMinute: 100,
    keyGenerator: (context) => context?.user?.id || context?.ip || 'anonymous',
  },
};

/**
 * Calculate query depth by counting nested selection sets
 */
function calculateQueryDepth(selectionSet: any, currentDepth = 0): number {
  if (!selectionSet || !selectionSet.selections) {
    return currentDepth;
  }

  let maxDepth = currentDepth;

  for (const selection of selectionSet.selections) {
    if (selection.selectionSet) {
      const depth = calculateQueryDepth(selection.selectionSet, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  }

  return maxDepth;
}

/**
 * Calculate query complexity (simple heuristic based on fields and depth)
 */
function calculateQueryComplexity(selectionSet: any, multiplier = 1): number {
  if (!selectionSet || !selectionSet.selections) {
    return 0;
  }

  let complexity = 0;

  for (const selection of selectionSet.selections) {
    // Each field adds to complexity
    complexity += multiplier;

    // Lists multiply complexity
    if (selection.name?.value?.endsWith('s') || selection.name?.value?.includes('List')) {
      const listMultiplier = multiplier * 10; // Lists are 10x more expensive
      if (selection.selectionSet) {
        complexity += calculateQueryComplexity(selection.selectionSet, listMultiplier);
      }
    } else if (selection.selectionSet) {
      complexity += calculateQueryComplexity(selection.selectionSet, multiplier);
    }
  }

  return complexity;
}

/**
 * Create GraphQL validation and security plugin
 */
export function createGraphQLValidationPlugin(
  options: ValidationPluginOptions = {}
): ApolloServerPlugin {
  const config = { ...defaultOptions, ...options };

  return {
    async requestDidStart(
      requestContext: GraphQLRequestContext<any>
    ): Promise<GraphQLRequestListener<any>> {
      const startTime = Date.now();
      let operationName: string | undefined;
      let queryDepth = 0;
      let queryComplexity = 0;

      return {
        async didResolveOperation(context) {
          operationName = context.operation?.name?.value;
          const operation = context.operation;

          if (!operation) {
            return;
          }

          // Calculate query depth
          queryDepth = calculateQueryDepth(operation.selectionSet);
          if (queryDepth > config.maxDepth) {
            throw new GraphQLError(
              `Query depth ${queryDepth} exceeds maximum allowed depth of ${config.maxDepth}`,
              {
                extensions: {
                  code: 'QUERY_TOO_COMPLEX',
                  depth: queryDepth,
                  maxDepth: config.maxDepth,
                },
              }
            );
          }

          // Calculate query complexity
          queryComplexity = calculateQueryComplexity(operation.selectionSet);
          if (queryComplexity > config.maxComplexity) {
            throw new GraphQLError(
              `Query complexity ${queryComplexity} exceeds maximum allowed complexity of ${config.maxComplexity}`,
              {
                extensions: {
                  code: 'QUERY_TOO_COMPLEX',
                  complexity: queryComplexity,
                  maxComplexity: config.maxComplexity,
                },
              }
            );
          }

          // Validate operation type for mutations
          if (operation.operation === 'mutation') {
            const context = requestContext.contextValue;

            // Ensure user is authenticated for mutations
            if (!context?.user) {
              throw new GraphQLError('Authentication required for mutations', {
                extensions: { code: 'UNAUTHENTICATED' },
              });
            }
          }
        },

        async executionDidStart() {
          return {
            willResolveField({ info, args }) {
              // Sanitize inputs if enabled
              if (config.enableSanitization && args) {
                // Sanitize all string arguments
                for (const [key, value] of Object.entries(args)) {
                  if (typeof value === 'string') {
                    args[key] = SanitizationUtils.sanitizeUserInput(value);
                  } else if (value && typeof value === 'object') {
                    args[key] = SanitizationUtils.sanitizeUserInput(value);
                  }
                }
              }

              // Validate inputs for security issues
              const validation = SecurityValidator.validateInput(args);
              if (!validation.valid) {
                throw new GraphQLError(`Invalid input: ${validation.errors.join(', ')}`, {
                  extensions: { code: 'BAD_USER_INPUT', validationErrors: validation.errors },
                });
              }
            },
          };
        },

        async willSendResponse(context) {
          const duration = Date.now() - startTime;

          // Audit log if enabled
          if (config.enableAuditLog) {
            logger.info({
              type: 'graphql_operation',
              operationName,
              operationType: context.operation?.operation,
              depth: queryDepth,
              complexity: queryComplexity,
              duration,
              userId: context.contextValue?.user?.id,
              tenantId: context.contextValue?.user?.tenant,
              success: !context.response.errors,
              errorCount: context.response.errors?.length || 0,
            });
          }

          // Log slow queries
          if (duration > 5000) {
            logger.warn({
              message: 'Slow GraphQL query detected',
              operationName,
              duration,
              complexity: queryComplexity,
              depth: queryDepth,
            });
          }

          // Add security headers to response
          if (context.response.http) {
            context.response.http.headers.set('X-Content-Type-Options', 'nosniff');
            context.response.http.headers.set('X-Frame-Options', 'DENY');
            context.response.http.headers.set('X-XSS-Protection', '1; mode=block');
          }
        },

        async didEncounterErrors(context) {
          // Log errors for security monitoring
          logger.error({
            type: 'graphql_error',
            operationName,
            errors: context.errors.map((e) => ({
              message: e.message,
              code: e.extensions?.code,
              path: e.path,
            })),
            userId: context.contextValue?.user?.id,
            tenantId: context.contextValue?.user?.tenant,
          });
        },
      };
    },
  };
}

/**
 * Validate GraphQL query string before execution
 */
export function validateGraphQLQuery(
  query: string,
  variables?: Record<string, any>,
  operationName?: string
): void {
  // Validate using schema
  validateInput(GraphQLInputSchema, {
    query,
    variables,
    operationName,
  });

  // Check for introspection in production
  if (process.env.NODE_ENV === 'production' && query.includes('__schema')) {
    throw new GraphQLError('Introspection is disabled in production', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /__typename.*__typename.*__typename/, // Excessive __typename queries
    /query.*{.*query.*{.*query/, // Excessive nesting (attempt to bypass depth limit)
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(query)) {
      throw new GraphQLError('Query contains suspicious patterns', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
  }
}
