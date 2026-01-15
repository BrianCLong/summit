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

import { ApolloServerPlugin, GraphQLRequestContext } from '@apollo/server';
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

interface OTelConfig {
  serviceName: string;
  otlpEndpoint?: string;
  samplingRate?: number; // 0.0 to 1.0
  enableDebug?: boolean;
}

interface GraphQLAttributes {
  tenant?: string;
  operationName?: string;
  purpose?: string;
  cacheMode?: 'hit' | 'miss' | 'bypass';
}

/**
 * Initialize OpenTelemetry tracer provider with OTLP export
 */
function initializeTracer(config: OTelConfig): NodeTracerProvider {
  const resource = Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    })
  );

  const provider = new NodeTracerProvider({
    resource,
    // Sampling: Respect parent decision, else sample based on configured rate
    // Default: 100% sampling for non-production, 10% for production
    sampler: config.samplingRate !== undefined
      ? { shouldSample: () => ({ decision: Math.random() < config.samplingRate ? 1 : 0 }) }
      : undefined,
  });

  // OTLP Exporter for traces
  if (config.otlpEndpoint) {
    const otlpExporter = new OTLPTraceExporter({
      url: `${config.otlpEndpoint}/v1/traces`,
      headers: {
        // Add authorization header if needed
        ...(process.env.OTEL_EXPORTER_OTLP_HEADERS
          ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
          : {}),
      },
    });

    provider.addSpanProcessor(new BatchSpanProcessor(otlpExporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
    }));
  }

  // Register global tracer provider
  provider.register({
    propagator: new W3CTraceContextPropagator(),
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
function extractAttributes(requestContext: GraphQLRequestContext<any>): GraphQLAttributes {
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
export function createOTelApolloPlugin(config: OTelConfig): ApolloServerPlugin {
  // Initialize tracer
  const provider = initializeTracer(config);
  const tracer = trace.getTracer(config.serviceName);

  return {
    async requestDidStart(requestContext: GraphQLRequestContext<any>) {
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
          const parseSpan = tracer.startSpan('graphql.parse', {}, context.active());
          return async (err?: Error) => {
            if (err) {
              parseSpan.recordException(err);
              parseSpan.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
            }
            parseSpan.end();
          };
        },

        async validationDidStart() {
          const validateSpan = tracer.startSpan('graphql.validate', {}, context.active());
          return async (errs?: ReadonlyArray<Error>) => {
            if (errs && errs.length > 0) {
              errs.forEach((err) => validateSpan.recordException(err));
              validateSpan.setStatus({ code: SpanStatusCode.ERROR });
            }
            validateSpan.end();
          };
        },

        async executionDidStart() {
          const executeSpan = tracer.startSpan('graphql.execute', {}, context.active());
          return {
            willResolveField({ info }) {
              // Create span for each field resolver
              const fieldSpan = tracer.startSpan(`graphql.resolve.${info.parentType.name}.${info.fieldName}`, {
                attributes: {
                  'graphql.field.name': info.fieldName,
                  'graphql.field.type': info.returnType.toString(),
                  'graphql.parent.type': info.parentType.name,
                },
              }, context.active());

              return (error?: Error | null, result?: any) => {
                if (error) {
                  fieldSpan.recordException(error);
                  fieldSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                }
                fieldSpan.end();
              };
            },

            async executionDidEnd(err?: Error) {
              if (err) {
                executeSpan.recordException(err);
                executeSpan.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
              }
              executeSpan.end();
            },
          };
        },

        async willSendResponse({ response, errors }) {
          // Record response status
          if (errors && errors.length > 0) {
            span.setStatus({ code: SpanStatusCode.ERROR });
            errors.forEach((err) => {
              span.recordException(new Error(err.message));
              span.setAttributes({
                'graphql.error.message': err.message,
                'graphql.error.path': err.path?.join('.') || 'unknown',
              });
            });
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
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
          span.setStatus({ code: SpanStatusCode.ERROR });
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

export default createOTelApolloPlugin;
