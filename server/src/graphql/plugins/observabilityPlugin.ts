/**
 * GraphQL Observability Plugin
 * Provides comprehensive tracing, metrics, and logging for GraphQL operations
 */

import type {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestListener,
  GraphQLRequestExecutionListener,
} from '@apollo/server';
import { getTracer, SpanKind } from '../../observability/tracer.js';
import {
  graphqlOperationComplexity,
  graphqlFieldResolutionCount,
  serviceErrors,
} from '../../observability/enhanced-metrics.js';
import {
  graphqlRequestDuration,
  graphqlRequestsTotal,
  graphqlErrors,
  graphqlResolverDurationSeconds,
  graphqlResolverErrorsTotal,
  graphqlResolverCallsTotal,
} from '../../monitoring/metrics.js';
import pino from 'pino';

const logger = pino({ name: 'graphql-observability' });

interface ObservabilityPluginOptions {
  /** Enable detailed resolver tracing (may impact performance) */
  traceResolvers?: boolean;
  /** Log slow operations above this threshold (ms) */
  slowOperationThresholdMs?: number;
  /** Fields to exclude from logging (for PII protection) */
  excludeFields?: string[];
  /** Maximum depth for operation complexity calculation */
  maxDepth?: number;
}

const DEFAULT_OPTIONS: ObservabilityPluginOptions = {
  traceResolvers: true,
  slowOperationThresholdMs: 1000,
  excludeFields: ['password', 'token', 'secret', 'apiKey', 'authorization'],
  maxDepth: 10,
};

/**
 * Create an Apollo Server plugin for comprehensive observability
 */
export function createObservabilityPlugin(
  options: ObservabilityPluginOptions = {},
): ApolloServerPlugin<any> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return {
    async requestDidStart(
      requestContext: GraphQLRequestContext<any>,
    ): Promise<GraphQLRequestListener<any>> {
      const tracer = getTracer();
      const startTime = Date.now();
      const requestId =
        requestContext.request.http?.headers.get('x-correlation-id') ||
        requestContext.request.http?.headers.get('x-request-id') ||
        crypto.randomUUID();

      // Extract operation info
      let operationName = requestContext.request.operationName || 'anonymous';
      let operationType = 'unknown';
      let fieldCount = 0;

      // Start root span for the GraphQL request
      const rootSpan = tracer.startSpan(`graphql.${operationType}.${operationName}`, {
        kind: SpanKind.SERVER,
        attributes: {
          'graphql.request_id': requestId,
          'graphql.operation.name': operationName,
        },
      });

      return {
        async didResolveOperation(ctx) {
          // Update operation info once resolved
          operationName = ctx.operationName || operationName;
          operationType = ctx.operation?.operation || 'query';

          rootSpan.setAttribute('graphql.operation.name', operationName);
          rootSpan.setAttribute('graphql.operation.type', operationType);

          // Calculate and record operation complexity
          if (ctx.document) {
            const complexity = estimateComplexity(ctx.document, opts.maxDepth || 10);
            graphqlOperationComplexity.observe(
              { operation: operationName, operation_type: operationType },
              complexity,
            );
            rootSpan.setAttribute('graphql.operation.complexity', complexity);
          }
        },

        async executionDidStart(): Promise<GraphQLRequestExecutionListener<any>> {
          return {
            willResolveField({ info }) {
              if (!opts.traceResolvers) return undefined;

              const resolverStartTime = process.hrtime.bigint();
              const fieldName = info.fieldName;
              const typeName = info.parentType.name;
              const resolverName = `${typeName}.${fieldName}`;

              fieldCount++;

              // Record resolver call
              graphqlResolverCallsTotal.inc({
                resolver_name: resolverName,
                field_name: fieldName,
                type_name: typeName,
              });

              // Start resolver span
              const resolverSpan = tracer.startSpan(`graphql.resolver.${resolverName}`, {
                kind: SpanKind.INTERNAL,
                attributes: {
                  'graphql.field.name': fieldName,
                  'graphql.type.name': typeName,
                  'graphql.field.path': info.path.key?.toString(),
                },
              });

              return (error: unknown) => {
                const duration = Number(process.hrtime.bigint() - resolverStartTime) / 1e9;
                const status = error ? 'error' : 'success';

                // Record resolver duration
                graphqlResolverDurationSeconds.observe(
                  {
                    resolver_name: resolverName,
                    field_name: fieldName,
                    type_name: typeName,
                    status,
                  },
                  duration,
                );

                if (error) {
                  const errorType = (error as any)?.constructor?.name || 'Error';
                  graphqlResolverErrorsTotal.inc({
                    resolver_name: resolverName,
                    field_name: fieldName,
                    type_name: typeName,
                    error_type: errorType,
                  });

                  resolverSpan.setAttribute('error', true);
                  resolverSpan.setAttribute('error.type', errorType);
                }

                resolverSpan.end();
              };
            },
          };
        },

        async willSendResponse(ctx) {
          const duration = Date.now() - startTime;
          const durationSec = duration / 1000;
          const hasErrors = (ctx.errors?.length ?? 0) > 0;
          const status = hasErrors ? 'error' : 'success';

          // Record field count
          graphqlFieldResolutionCount.inc({ operation: operationName }, fieldCount);

          // Record request duration
          graphqlRequestDuration.observe(
            { operation: operationName, operation_type: operationType },
            durationSec,
          );

          // Record request count
          graphqlRequestsTotal.inc({
            operation: operationName,
            operation_type: operationType,
            status,
          });

          // Record errors
          if (hasErrors) {
            for (const error of ctx.errors || []) {
              const errorType = error.extensions?.code || 'INTERNAL_SERVER_ERROR';
              graphqlErrors.inc({
                operation: operationName,
                error_type: String(errorType),
              });

              serviceErrors.inc({
                service: 'graphql',
                error_type: String(errorType),
                severity: 'error',
              });
            }
          }

          // Log slow operations
          if (duration > (opts.slowOperationThresholdMs || 1000)) {
            logger.warn(
              {
                requestId,
                operationName,
                operationType,
                duration,
                fieldCount,
                hasErrors,
              },
              `Slow GraphQL operation: ${operationName} took ${duration}ms`,
            );
          }

          // Update span attributes
          rootSpan.setAttribute('graphql.duration_ms', duration);
          rootSpan.setAttribute('graphql.field_count', fieldCount);
          rootSpan.setAttribute('graphql.has_errors', hasErrors);
          rootSpan.setAttribute('graphql.error_count', ctx.errors?.length || 0);

          if (hasErrors) {
            rootSpan.setAttribute('error', true);
          }

          rootSpan.end();
        },

        async didEncounterErrors(ctx) {
          for (const error of ctx.errors) {
            logger.error(
              {
                requestId,
                operationName,
                operationType,
                errorMessage: error.message,
                errorPath: error.path,
                errorCode: error.extensions?.code,
              },
              `GraphQL error in ${operationName}: ${error.message}`,
            );

            tracer.recordException(error);
          }
        },
      };
    },
  };
}

/**
 * Estimate operation complexity based on AST depth and field count
 */
function estimateComplexity(document: any, maxDepth: number): number {
  let complexity = 0;

  function visit(node: any, depth: number): void {
    if (depth > maxDepth) return;

    if (node.kind === 'Field') {
      // Base complexity for each field
      complexity += 1;

      // Add depth factor
      complexity += depth * 0.5;

      // Check for pagination arguments (indicates list operations)
      const args = node.arguments || [];
      for (const arg of args) {
        if (['first', 'last', 'limit', 'take'].includes(arg.name?.value)) {
          const value = arg.value?.value;
          if (typeof value === 'number' || typeof value === 'string') {
            complexity += Math.min(parseInt(String(value), 10) || 10, 100) * 0.1;
          }
        }
      }
    }

    // Recursively visit children
    if (node.selectionSet?.selections) {
      for (const selection of node.selectionSet.selections) {
        visit(selection, depth + 1);
      }
    }

    if (node.definitions) {
      for (const def of node.definitions) {
        visit(def, depth);
      }
    }
  }

  visit(document, 0);
  return Math.round(complexity);
}

// Export default instance
export default createObservabilityPlugin();
