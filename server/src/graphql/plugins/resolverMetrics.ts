import type { ApolloServerPlugin, GraphQLRequestContext, GraphQLRequestListener, GraphQLRequestExecutionListener } from '@apollo/server';
import {
  graphqlResolverDurationSeconds,
  graphqlResolverErrorsTotal,
  graphqlResolverCallsTotal,
} from '../../monitoring/metrics.js';

const resolverMetricsPlugin: ApolloServerPlugin<any> = {
  async requestDidStart(_ctx: GraphQLRequestContext<any>): Promise<GraphQLRequestListener<any>> {
    return {
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
