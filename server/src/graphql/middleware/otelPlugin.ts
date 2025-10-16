import { tracer, SpanStatusCode } from '../../observability/telemetry.js';

export function otelApolloPlugin() {
  return {
    async requestDidStart() {
      const t = tracer;
      return {
        async executionDidStart() {
          return {
            willResolveField({ info }) {
              const span = t.startSpan(
                `resolver ${info.parentType.name}.${info.fieldName}`,
              );
              const start = Date.now();
              return (err: unknown) => {
                if (err) {
                  span.recordException?.(err as Error);
                  span.setStatus?.({ code: SpanStatusCode.ERROR as any });
                }
                span.setAttribute?.('graphql.type', info.returnType.toString());
                span.setAttribute?.('graphql.path', info.path.key.toString());
                span.end?.();
              };
            },
          };
        },
      };
    },
  };
}
