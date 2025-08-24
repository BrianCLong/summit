import type { ApolloServerPlugin } from "@apollo/server";
import {
  graphqlResolverDurationSeconds,
  graphqlResolverErrorsTotal,
  graphqlResolverCallsTotal,
} from "../../monitoring/metrics.js";
import { otelService } from "../../monitoring/opentelemetry.js";

const resolverMetricsPlugin: ApolloServerPlugin = {
  requestDidStart() {
    return {
      executionDidStart() {
        return {
          willResolveField({ info, args }) {
            const start = process.hrtime.bigint();
            const labels = {
              resolver_name: `${info.parentType.name}.${info.fieldName}`,
              field_name: info.fieldName,
              type_name: info.parentType.name,
            };
            graphqlResolverCallsTotal.inc(labels);
            const span = otelService.startSpan(`resolver.${info.parentType.name}.${info.fieldName}`, labels);
            if (args?.id) span.setAttribute('entity.id', args.id);
            if (args?.ids) span.setAttribute('entity.ids', JSON.stringify(args.ids));
            return (error: unknown) => {
              const duration = Number(process.hrtime.bigint() - start) / 1e9;
              graphqlResolverDurationSeconds.observe(
                { ...labels, status: error ? "error" : "success" },
                duration,
              );
              if (error) {
                const errType = (error as any)?.constructor?.name || "Error";
                graphqlResolverErrorsTotal.inc({
                  ...labels,
                  error_type: errType,
                });
                span.setStatus({ code: 2, message: errType });
              } else {
                span.setStatus({ code: 1 });
              }
              span.end();
            };
          },
        };
      },
    };
  },
};

export default resolverMetricsPlugin;
