import { trace, SpanStatusCode } from '@opentelemetry/api';
export function otelApolloPlugin() {
    return {
        async requestDidStart() {
            const tracer = trace.getTracer('intelgraph-graphql');
            return {
                async executionDidStart() {
                    return {
                        willResolveField({ info }) {
                            const span = tracer.startSpan(`resolver ${info.parentType.name}.${info.fieldName}`);
                            const start = Date.now();
                            return (err) => {
                                if (err) {
                                    span.recordException(err);
                                    span.setStatus({ code: SpanStatusCode.ERROR });
                                }
                                span.setAttribute('graphql.type', info.returnType.toString());
                                span.setAttribute('graphql.path', info.path.key.toString());
                                span.end();
                            };
                        },
                    };
                },
            };
        },
    };
}
//# sourceMappingURL=otelPlugin.js.map