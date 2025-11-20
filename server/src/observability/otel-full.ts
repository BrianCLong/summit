/**
 * Full OpenTelemetry Tracing Implementation
 * Provides distributed tracing across all services with Jaeger/OTLP export
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import logger from '../utils/logger.js';

// Configuration
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'intelgraph-server';
const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const OTEL_ENABLED = process.env.OTEL_ENABLED !== 'false';
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
const JAEGER_ENDPOINT = process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces';

// Resource definition
const resource = Resource.default().merge(
  new Resource({
    [SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
    [SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: ENVIRONMENT,
  })
);

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK with auto-instrumentation
 */
export function initializeOTel(): NodeSDK {
  if (!OTEL_ENABLED) {
    logger.info('OpenTelemetry tracing is disabled');
    return null as any;
  }

  // Trace exporter (OTLP)
  const traceExporter = new OTLPTraceExporter({
    url: OTLP_ENDPOINT,
    headers: {},
  });

  // Metrics exporter (Prometheus)
  const prometheusExporter = new PrometheusExporter({
    port: 9464,
    endpoint: '/metrics',
  }, () => {
    logger.info(`Prometheus metrics available at http://localhost:9464/metrics`);
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader: prometheusExporter,
    spanProcessor: ENVIRONMENT === 'development'
      ? new SimpleSpanProcessor(new ConsoleSpanExporter())
      : new BatchSpanProcessor(traceExporter, {
          maxQueueSize: 2048,
          maxExportBatchSize: 512,
          scheduledDelayMillis: 5000,
          exportTimeoutMillis: 30000,
        }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreIncomingPaths: ['/health', '/metrics', '/ready'],
        },
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        '@opentelemetry/instrumentation-redis': { enabled: true },
        '@opentelemetry/instrumentation-graphql': { enabled: true },
        '@opentelemetry/instrumentation-ioredis': { enabled: true },
      }),
    ],
  });

  sdk.start();
  logger.info('OpenTelemetry SDK initialized', {
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    environment: ENVIRONMENT,
    otlpEndpoint: OTLP_ENDPOINT,
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk?.shutdown()
      .then(() => logger.info('OpenTelemetry SDK shut down successfully'))
      .catch((error) => logger.error('Error shutting down OpenTelemetry SDK', error));
  });

  return sdk;
}

/**
 * Get the active tracer
 */
export function getTracer(name: string = SERVICE_NAME) {
  return trace.getTracer(name, SERVICE_VERSION);
}

/**
 * Create a custom span with automatic error handling
 */
export async function withSpan<T>(
  name: string,
  fn: (span: any) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();

  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        span.setAttributes(attributes);
      }

      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Trace database operations with detailed metrics
 */
export async function traceDbOperation<T>(
  operation: string,
  dbType: 'postgres' | 'neo4j' | 'redis' | 'timescale',
  query: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    `db.${dbType}.${operation}`,
    async (span) => {
      span.setAttributes({
        'db.system': dbType,
        'db.operation': operation,
        'db.statement': query.substring(0, 500), // Truncate long queries
      });

      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;

      span.setAttributes({
        'db.duration_ms': duration,
      });

      return result;
    }
  );
}

/**
 * Trace GraphQL operations
 */
export async function traceGraphQLOperation<T>(
  operationName: string,
  operationType: 'query' | 'mutation' | 'subscription',
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    `graphql.${operationType}.${operationName}`,
    async (span) => {
      span.setAttributes({
        'graphql.operation.name': operationName,
        'graphql.operation.type': operationType,
      });

      return await fn();
    }
  );
}

/**
 * Trace external HTTP calls
 */
export async function traceHttpCall<T>(
  method: string,
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    `http.client.${method}`,
    async (span) => {
      span.setAttributes({
        'http.method': method,
        'http.url': url,
        'span.kind': SpanKind.CLIENT,
      });

      return await fn();
    }
  );
}

/**
 * Add custom attributes to the current active span
 */
export function addSpanAttribute(key: string, value: string | number | boolean) {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute(key, value);
  }
}

/**
 * Record an exception in the current span
 */
export function recordException(error: Error, attributes?: Record<string, any>) {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    if (attributes) {
      span.setAttributes(attributes);
    }
    span.setStatus({ code: SpanStatusCode.ERROR });
  }
}

// Auto-initialize if enabled
if (OTEL_ENABLED && process.env.NODE_ENV !== 'test') {
  initializeOTel();
}

export { SpanStatusCode, SpanKind, trace, context };
