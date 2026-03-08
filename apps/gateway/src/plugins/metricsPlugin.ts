/**
 * Apollo Server Metrics Plugin
 * Captures GraphQL operation metrics and sends to Prometheus/OpenTelemetry
 */

import type { ApolloServerPlugin, GraphQLRequestContext } from '@apollo/server';
import {
  recordQueryDuration,
  recordError,
  recordQueryComplexity,
  getOperationInfo,
} from '../metrics';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('graphql-gateway', '1.0.0');

interface MetricsPluginOptions {
  enableComplexityTracking?: boolean;
}

export function metricsPlugin(
  options: MetricsPluginOptions = {}
): ApolloServerPlugin {
  const { enableComplexityTracking = false } = options;

  return {
    async requestDidStart(
      requestContext: GraphQLRequestContext<any>
    ): Promise<any> {
      const startTime = Date.now();
      const { operationName, operationType } = getOperationInfo(requestContext);

      // Start a span for this GraphQL request
      const span = tracer.startSpan('graphql.query', {
        attributes: {
          'graphql.operation.name': operationName || 'anonymous',
          'graphql.operation.type': operationType,
        },
      });

      return {
        async willSendResponse(
          responseContext: GraphQLRequestContext<any>
        ): Promise<void> {
          const durationMs = Date.now() - startTime;
          const hasErrors = responseContext.errors && responseContext.errors.length > 0;
          const status = hasErrors ? 'error' : 'success';

          // Record metrics
          recordQueryDuration(operationName, operationType, durationMs, status);

          // Record errors
          if (hasErrors) {
            for (const error of responseContext.errors) {
              const errorType = error.extensions?.code || 'INTERNAL_SERVER_ERROR';
              const errorCode = error.extensions?.errorCode;
              recordError(operationName, errorType as string, errorCode as string);

              // Add error to span
              span.recordException(error);
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
              });
            }
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
          }

          // Add span attributes
          span.setAttribute('graphql.response.status', status);
          span.setAttribute('graphql.response.duration_ms', durationMs);

          // End span
          span.end();
        },

        async didResolveOperation(
          operationContext: GraphQLRequestContext<any>
        ): Promise<void> {
          // Track query complexity if enabled
          if (enableComplexityTracking) {
            const complexity = calculateComplexity(operationContext);
            if (complexity !== null) {
              recordQueryComplexity(operationName, complexity);
              trace
                .getActiveSpan()
                ?.setAttribute('graphql.query.complexity', complexity);
            }
          }
        },

        async executionDidStart(): Promise<any> {
          return {
            willResolveField({
              info,
            }: {
              info: any;
            }): ((error: Error | null, result: any) => void) | void {
              const startTime = Date.now();
              const typeName = info.parentType.name;
              const fieldName = info.fieldName;

              // Start resolver span
              const resolverSpan = tracer.startSpan(
                `graphql.resolve.${typeName}.${fieldName}`,
                {
                  attributes: {
                    'graphql.field.path': info.path.key,
                    'graphql.field.type': typeName,
                    'graphql.field.name': fieldName,
                  },
                }
              );

              return (error: Error | null) => {
                const durationMs = Date.now() - startTime;
                const status = error ? 'error' : 'success';

                // Record resolver metrics (only for slow resolvers > 10ms to reduce cardinality)
                if (durationMs > 10) {
                  // recordResolverDuration(typeName, fieldName, durationMs, status);
                }

                // Update resolver span
                resolverSpan.setAttribute('graphql.resolver.duration_ms', durationMs);
                if (error) {
                  resolverSpan.recordException(error);
                  resolverSpan.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error.message,
                  });
                } else {
                  resolverSpan.setStatus({ code: SpanStatusCode.OK });
                }

                resolverSpan.end();
              };
            },
          };
        },
      };
    },
  };
}

// Simple complexity calculator (count fields)
function calculateComplexity(
  requestContext: GraphQLRequestContext<any>
): number | null {
  try {
    const operation = requestContext.operation;
    if (!operation) return null;

    // Simple heuristic: count selection set fields recursively
    let complexity = 0;

    function countFields(selectionSet: any): void {
      if (!selectionSet || !selectionSet.selections) return;

      for (const selection of selectionSet.selections) {
        complexity++;
        if (selection.selectionSet) {
          countFields(selection.selectionSet);
        }
      }
    }

    countFields(operation.selectionSet);
    return complexity;
  } catch {
    return null;
  }
}
