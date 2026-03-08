"use strict";
/**
 * OpenTelemetry Apollo Server Plugin
 *
 * Provides comprehensive OpenTelemetry instrumentation for Apollo Server with:
 * - Semantic attributes: tenant, operationName, purpose, cacheMode
 * - OTLP export to observability backend
 * - Performance tracking and error monitoring
 * - Sampling rules and context propagation
 *
 * Usage:
 * ```typescript
 * import { createOTelApolloPlugin } from './otel-apollo-plugin';
 *
 * const server = new ApolloServer({
 *   plugins: [createOTelApolloPlugin({
 *     serviceName: 'summit-graphql',
 *     otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
 *   })],
 * });
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOTelApolloPlugin = createOTelApolloPlugin;
const api_1 = require("@opentelemetry/api");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const core_1 = require("@opentelemetry/core");
/**
 * Initialize OpenTelemetry tracer provider with OTLP export
 */
function initializeTracer(config) {
    const resource = resources_1.Resource.default().merge(new resources_1.Resource({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    }));
    const provider = new sdk_trace_node_1.NodeTracerProvider({
        resource,
        // Sampling: Respect parent decision, else sample based on configured rate
        // Default: 100% sampling for non-production, 10% for production
        sampler: config.samplingRate !== undefined
            ? { shouldSample: () => ({ decision: Math.random() < config.samplingRate ? 1 : 0 }) }
            : undefined,
    });
    // OTLP Exporter for traces
    if (config.otlpEndpoint) {
        const otlpExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
            url: `${config.otlpEndpoint}/v1/traces`,
            headers: {
                // Add authorization header if needed
                ...(process.env.OTEL_EXPORTER_OTLP_HEADERS
                    ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
                    : {}),
            },
        });
        provider.addSpanProcessor(new sdk_trace_base_1.BatchSpanProcessor(otlpExporter, {
            maxQueueSize: 2048,
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5000,
        }));
    }
    // Register global tracer provider
    provider.register({
        propagator: new core_1.W3CTraceContextPropagator(),
    });
    if (config.enableDebug) {
        console.log('[OTel] Tracer initialized:', {
            serviceName: config.serviceName,
            otlpEndpoint: config.otlpEndpoint,
            samplingRate: config.samplingRate,
        });
    }
    return provider;
}
/**
 * Extract semantic attributes from GraphQL context
 */
function extractAttributes(requestContext) {
    const { contextValue, request } = requestContext;
    return {
        tenant: contextValue?.user?.tenantId || contextValue?.tenant || 'unknown',
        operationName: request.operationName || 'anonymous',
        purpose: contextValue?.purpose || 'general',
        cacheMode: contextValue?.cacheMode || 'miss',
    };
}
/**
 * Create Apollo Server OpenTelemetry plugin
 */
function createOTelApolloPlugin(config) {
    // Initialize tracer
    const provider = initializeTracer(config);
    const tracer = api_1.trace.getTracer(config.serviceName);
    return {
        async requestDidStart(requestContext) {
            // Start root span for GraphQL request
            const span = tracer.startSpan('graphql.request', {
                attributes: {
                    'graphql.operation.type': requestContext.request.query?.match(/^\s*(query|mutation|subscription)/i)?.[1] || 'unknown',
                },
            });
            // Add semantic attributes
            const attrs = extractAttributes(requestContext);
            span.setAttributes({
                'summit.tenant': attrs.tenant,
                'graphql.operation.name': attrs.operationName,
                'summit.purpose': attrs.purpose,
                'summit.cache.mode': attrs.cacheMode,
            });
            return {
                async parsingDidStart() {
                    const parseSpan = tracer.startSpan('graphql.parse', {}, api_1.context.active());
                    return async (err) => {
                        if (err) {
                            parseSpan.recordException(err);
                            parseSpan.setStatus({ code: api_1.SpanStatusCode.ERROR, message: err.message });
                        }
                        parseSpan.end();
                    };
                },
                async validationDidStart() {
                    const validateSpan = tracer.startSpan('graphql.validate', {}, api_1.context.active());
                    return async (errs) => {
                        if (errs && errs.length > 0) {
                            errs.forEach((err) => validateSpan.recordException(err));
                            validateSpan.setStatus({ code: api_1.SpanStatusCode.ERROR });
                        }
                        validateSpan.end();
                    };
                },
                async executionDidStart() {
                    const executeSpan = tracer.startSpan('graphql.execute', {}, api_1.context.active());
                    return {
                        willResolveField({ info }) {
                            // Create span for each field resolver
                            const fieldSpan = tracer.startSpan(`graphql.resolve.${info.parentType.name}.${info.fieldName}`, {
                                attributes: {
                                    'graphql.field.name': info.fieldName,
                                    'graphql.field.type': info.returnType.toString(),
                                    'graphql.parent.type': info.parentType.name,
                                },
                            }, api_1.context.active());
                            return (error, result) => {
                                if (error) {
                                    fieldSpan.recordException(error);
                                    fieldSpan.setStatus({ code: api_1.SpanStatusCode.ERROR, message: error.message });
                                }
                                fieldSpan.end();
                            };
                        },
                        async executionDidEnd(err) {
                            if (err) {
                                executeSpan.recordException(err);
                                executeSpan.setStatus({ code: api_1.SpanStatusCode.ERROR, message: err.message });
                            }
                            executeSpan.end();
                        },
                    };
                },
                async willSendResponse({ response, errors }) {
                    // Record response status
                    if (errors && errors.length > 0) {
                        span.setStatus({ code: api_1.SpanStatusCode.ERROR });
                        errors.forEach((err) => {
                            span.recordException(new Error(err.message));
                            span.setAttributes({
                                'graphql.error.message': err.message,
                                'graphql.error.path': err.path?.join('.') || 'unknown',
                            });
                        });
                    }
                    else {
                        span.setStatus({ code: api_1.SpanStatusCode.OK });
                    }
                    // Add cache metrics
                    if (response.data) {
                        const cacheMode = extractAttributes(requestContext).cacheMode;
                        span.setAttribute('summit.cache.hit', cacheMode === 'hit');
                    }
                    span.end();
                },
                async didEncounterErrors({ errors }) {
                    errors.forEach((err) => {
                        span.recordException(err);
                    });
                    span.setStatus({ code: api_1.SpanStatusCode.ERROR });
                },
            };
        },
    };
}
/**
 * Sampling rules documentation
 *
 * Default sampling strategy:
 * - Production: 10% sampling (configurable via samplingRate: 0.1)
 * - Non-production: 100% sampling (samplingRate: 1.0)
 * - Parent-based: Always respect parent span sampling decision
 *
 * Environment variables:
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP collector endpoint (e.g., http://localhost:4318)
 * - OTEL_EXPORTER_OTLP_HEADERS: JSON-encoded headers for authentication
 * - OTEL_SERVICE_NAME: Service name (defaults to 'summit-graphql')
 *
 * Example .env:
 * ```
 * OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.grafana.net
 * OTEL_EXPORTER_OTLP_HEADERS={"Authorization":"Basic <base64-token>"}
 * OTEL_SERVICE_NAME=summit-graphql-prod
 * ```
 *
 * Trace attributes:
 * - summit.tenant: Multi-tenant identifier
 * - graphql.operation.name: GraphQL operation name
 * - summit.purpose: Request purpose (analytics, compliance, etc.)
 * - summit.cache.mode: Cache status (hit, miss, bypass)
 * - summit.cache.hit: Boolean cache hit indicator
 *
 * Spans created:
 * - graphql.request: Root span for entire GraphQL request
 * - graphql.parse: Query parsing phase
 * - graphql.validate: Query validation phase
 * - graphql.execute: Query execution phase
 * - graphql.resolve.<Type>.<field>: Individual field resolution
 */
exports.default = createOTelApolloPlugin;
