import type { ApolloServerPlugin, GraphQLRequestContext, GraphQLRequestListener, GraphQLRequestExecutionListener } from '@apollo/server';
import {
  graphqlResolverDurationSeconds,
  graphqlResolverErrorsTotal,
  graphqlResolverCallsTotal,
  graphqlRequestDuration,
  graphqlRequestsTotal,
  graphqlErrors,
} from '../../monitoring/metrics.js';

const resolverMetricsPlugin: ApolloServerPlugin<any> = {
  async requestDidStart(requestContext: GraphQLRequestContext<any>): Promise<GraphQLRequestListener<any>> {
    const start = process.hrtime.bigint();

    return {
      async willSendResponse(requestContext) {
        const duration = Number(process.hrtime.bigint() - start) / 1e9;
        const operationName = requestContext.request.operationName || 'Anonymous';
        const operationType = requestContext.operation?.operation || 'unknown';

        if (graphqlRequestsTotal) {
          graphqlRequestsTotal.inc({
            operation: operationName,
            operation_type: operationType,
            status: requestContext.errors ? 'error' : 'success',
          });
        }

        if (graphqlRequestDuration) {
          graphqlRequestDuration.observe(
            {
              operation: operationName,
              operation_type: operationType,
            },
            duration,
          );
        }

        if (requestContext.errors && graphqlErrors) {
          requestContext.errors.forEach((error) => {
            const errorType = (error as any)?.extensions?.code || error.name || 'Error';
            graphqlErrors.inc({
              operation: operationName,
              error_type: errorType,
            });
          });
        }
      },
      async executionDidStart(): Promise<GraphQLRequestExecutionListener<any>> {
        return {
          willResolveField({ info }: { info: any }) {
            const start = process.hrtime.bigint();
            const labels = {
              resolver_name: `${info.parentType.name}.${info.fieldName}`,
              field_name: info.fieldName,
              type_name: info.parentType.name,
            };
            if (graphqlResolverCallsTotal) {
                graphqlResolverCallsTotal.inc(labels);
            }
            return (error: unknown) => {
              const duration = Number(process.hrtime.bigint() - start) / 1e9;
              if (graphqlResolverDurationSeconds) {
                  graphqlResolverDurationSeconds.observe(
                    { ...labels, status: error ? 'error' : 'success' },
                    duration,
                  );
              }
              if (error && graphqlResolverErrorsTotal) {
                const errType = (error as any)?.constructor?.name || 'Error';
                graphqlResolverErrorsTotal.inc({
                  ...labels,
                  error_type: errType,
                });
              }
            };
          },
        };
      },
    };
  },
};

export default resolverMetricsPlugin;
