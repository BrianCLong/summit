"use strict";
/**
 * Apollo Server Metrics Plugin
 * Captures GraphQL operation metrics and sends to Prometheus/OpenTelemetry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsPlugin = metricsPlugin;
const metrics_1 = require("../metrics");
const api_1 = require("@opentelemetry/api");
const tracer = api_1.trace.getTracer('graphql-gateway', '1.0.0');
const GOLDEN_PATH_STEPS = [
    'create_investigation',
    'add_entity',
    'add_relationship',
    'copilot_query',
    'view_results',
];
function metricsPlugin(options = {}) {
    const { enableComplexityTracking = false } = options;
    return {
        async requestDidStart(requestContext) {
            const startTime = Date.now();
            const { operationName, operationType } = (0, metrics_1.getOperationInfo)(requestContext);
            // Start a span for this GraphQL request
            const span = tracer.startSpan('graphql.query', {
                attributes: {
                    'graphql.operation.name': operationName || 'anonymous',
                    'graphql.operation.type': operationType,
                },
            });
            return {
                async willSendResponse(responseContext) {
                    const durationMs = Date.now() - startTime;
                    const hasErrors = responseContext.errors && responseContext.errors.length > 0;
                    const status = hasErrors ? 'error' : 'success';
                    // Record metrics
                    (0, metrics_1.recordQueryDuration)(operationName, operationType, durationMs, status);
                    // Record Golden Path metrics
                    if (operationName && GOLDEN_PATH_STEPS.includes(operationName)) {
                        if (hasErrors) {
                            // We just take the first error type for now
                            const errorType = responseContext.errors[0].extensions?.code ||
                                'INTERNAL_SERVER_ERROR';
                            (0, metrics_1.recordGoldenPathError)(operationName, errorType);
                        }
                        else {
                            (0, metrics_1.recordGoldenPathSuccess)(operationName, durationMs);
                        }
                    }
                    // Record errors
                    if (hasErrors) {
                        for (const error of responseContext.errors) {
                            const errorType = error.extensions?.code || 'INTERNAL_SERVER_ERROR';
                            const errorCode = error.extensions?.errorCode;
                            (0, metrics_1.recordError)(operationName, errorType, errorCode);
                            // Add error to span
                            span.recordException(error);
                            span.setStatus({
                                code: api_1.SpanStatusCode.ERROR,
                                message: error.message,
                            });
                        }
                    }
                    else {
                        span.setStatus({ code: api_1.SpanStatusCode.OK });
                    }
                    // Add span attributes
                    span.setAttribute('graphql.response.status', status);
                    span.setAttribute('graphql.response.duration_ms', durationMs);
                    // End span
                    span.end();
                },
                async didResolveOperation(operationContext) {
                    // Track query complexity if enabled
                    if (enableComplexityTracking) {
                        const complexity = calculateComplexity(operationContext);
                        if (complexity !== null) {
                            (0, metrics_1.recordQueryComplexity)(operationName, complexity);
                            api_1.trace
                                .getActiveSpan()
                                ?.setAttribute('graphql.query.complexity', complexity);
                        }
                    }
                },
                async executionDidStart() {
                    return {
                        willResolveField({ info, }) {
                            const startTime = Date.now();
                            const typeName = info.parentType.name;
                            const fieldName = info.fieldName;
                            // Start resolver span
                            const resolverSpan = tracer.startSpan(`graphql.resolve.${typeName}.${fieldName}`, {
                                attributes: {
                                    'graphql.field.path': info.path.key,
                                    'graphql.field.type': typeName,
                                    'graphql.field.name': fieldName,
                                },
                            });
                            return (error) => {
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
                                        code: api_1.SpanStatusCode.ERROR,
                                        message: error.message,
                                    });
                                }
                                else {
                                    resolverSpan.setStatus({ code: api_1.SpanStatusCode.OK });
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
function calculateComplexity(requestContext) {
    try {
        const operation = requestContext.operation;
        if (!operation)
            return null;
        // Simple heuristic: count selection set fields recursively
        let complexity = 0;
        function countFields(selectionSet) {
            if (!selectionSet || !selectionSet.selections)
                return;
            for (const selection of selectionSet.selections) {
                complexity++;
                if (selection.selectionSet) {
                    countFields(selection.selectionSet);
                }
            }
        }
        countFields(operation.selectionSet);
        return complexity;
    }
    catch {
        return null;
    }
}
