/**
 * CompanyOS Observability SDK - Distributed Tracing Module
 *
 * Provides OpenTelemetry-based distributed tracing with automatic
 * instrumentation and manual span creation utilities.
 */

import {
  trace,
  context,
  propagation,
  SpanStatusCode,
  SpanKind as OTelSpanKind,
  Span,
  Tracer,
  Context,
  TextMapGetter,
  TextMapSetter,
} from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import type { ServiceConfig, TracingConfig, SpanAttributes, SpanKind } from '../types/index.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface TracingInitConfig {
  service: ServiceConfig;
  /** OTLP endpoint for trace export */
  otlpEndpoint?: string;
  /** Sample rate (0.0 - 1.0) */
  sampleRate?: number;
  /** Enable auto-instrumentation */
  autoInstrumentation?: boolean;
  /** Batch span processing (recommended for production) */
  batchProcessing?: boolean;
  /** Additional resource attributes */
  resourceAttributes?: Record<string, string>;
}

// =============================================================================
// SDK INITIALIZATION
// =============================================================================

let sdk: NodeSDK | null = null;
let isInitialized = false;

/**
 * Initialize OpenTelemetry tracing for a service
 */
export async function initializeTracing(config: TracingInitConfig): Promise<void> {
  if (isInitialized) {
    console.warn('Tracing already initialized, skipping re-initialization');
    return;
  }

  const {
    service,
    otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    sampleRate = parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
    autoInstrumentation = true,
    batchProcessing = process.env.NODE_ENV === 'production',
    resourceAttributes = {},
  } = config;

  // Create resource with service attributes
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: service.name,
    [ATTR_SERVICE_VERSION]: service.version,
    [ATTR_DEPLOYMENT_ENVIRONMENT]: service.environment,
    'service.team': service.team,
    'service.tier': service.tier,
    'service.namespace': service.namespace,
    ...resourceAttributes,
  });

  // Create OTLP exporter
  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
    headers: {},
  });

  // Create span processor
  const spanProcessor = batchProcessing
    ? new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 30000,
      })
    : new SimpleSpanProcessor(traceExporter);

  // Initialize SDK
  sdk = new NodeSDK({
    resource,
    spanProcessors: [spanProcessor],
    instrumentations: autoInstrumentation ? [getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
    })] : [],
  });

  await sdk.start();
  isInitialized = true;

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await shutdownTracing();
  });
}

/**
 * Shutdown tracing gracefully
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    isInitialized = false;
  }
}

// =============================================================================
// TRACER ACCESS
// =============================================================================

/**
 * Get a tracer for manual span creation
 */
export function getTracer(name?: string, version?: string): Tracer {
  return trace.getTracer(name || 'companyos-observability', version || '1.0.0');
}

/**
 * Get the currently active span
 */
export function getActiveSpan(): Span | undefined {
  return trace.getActiveSpan();
}

/**
 * Get trace context from the active span
 */
export function getTraceContext(): { traceId?: string; spanId?: string } {
  const span = getActiveSpan();
  if (!span) return {};

  const ctx = span.spanContext();
  return {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
  };
}

// =============================================================================
// SPAN CREATION UTILITIES
// =============================================================================

const SPAN_KIND_MAP: Record<SpanKind, OTelSpanKind> = {
  internal: OTelSpanKind.INTERNAL,
  server: OTelSpanKind.SERVER,
  client: OTelSpanKind.CLIENT,
  producer: OTelSpanKind.PRODUCER,
  consumer: OTelSpanKind.CONSUMER,
};

export interface SpanOptions {
  kind?: SpanKind;
  attributes?: SpanAttributes;
  parent?: Context;
}

/**
 * Create and start a new span
 */
export function startSpan(
  name: string,
  options: SpanOptions = {}
): Span {
  const tracer = getTracer();
  const { kind = 'internal', attributes = {}, parent } = options;

  const ctx = parent || context.active();

  return tracer.startSpan(
    name,
    {
      kind: SPAN_KIND_MAP[kind],
      attributes,
    },
    ctx
  );
}

/**
 * Execute a function within a span context
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options: SpanOptions = {}
): Promise<T> {
  const span = startSpan(name, options);

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error) {
      span.recordException(error);
    }
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Execute a synchronous function within a span context
 */
export function withSpanSync<T>(
  name: string,
  fn: (span: Span) => T,
  options: SpanOptions = {}
): T {
  const span = startSpan(name, options);

  try {
    const result = context.with(trace.setSpan(context.active(), span), () => fn(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error) {
      span.recordException(error);
    }
    throw error;
  } finally {
    span.end();
  }
}

// =============================================================================
// SPECIALIZED SPAN CREATORS
// =============================================================================

/**
 * Create a span for HTTP client requests
 */
export function createHttpClientSpan(
  method: string,
  url: string,
  attributes?: SpanAttributes
): Span {
  return startSpan(`HTTP ${method}`, {
    kind: 'client',
    attributes: {
      'http.method': method,
      'http.url': url,
      ...attributes,
    },
  });
}

/**
 * Create a span for database operations
 */
export function createDbSpan(
  dbSystem: string,
  operation: string,
  statement?: string,
  attributes?: SpanAttributes
): Span {
  return startSpan(`${dbSystem} ${operation}`, {
    kind: 'client',
    attributes: {
      'db.system': dbSystem,
      'db.operation': operation,
      ...(statement && { 'db.statement': statement }),
      ...attributes,
    },
  });
}

/**
 * Create a span for cache operations
 */
export function createCacheSpan(
  cacheName: string,
  operation: string,
  key?: string,
  attributes?: SpanAttributes
): Span {
  return startSpan(`cache.${operation}`, {
    kind: 'client',
    attributes: {
      'cache.name': cacheName,
      'cache.operation': operation,
      ...(key && { 'cache.key': key }),
      ...attributes,
    },
  });
}

/**
 * Create a span for external service calls
 */
export function createExternalCallSpan(
  serviceName: string,
  operation: string,
  attributes?: SpanAttributes
): Span {
  return startSpan(`${serviceName}.${operation}`, {
    kind: 'client',
    attributes: {
      'peer.service': serviceName,
      'rpc.method': operation,
      ...attributes,
    },
  });
}

/**
 * Create a span for message queue operations
 */
export function createQueueSpan(
  queueName: string,
  operation: 'publish' | 'consume',
  attributes?: SpanAttributes
): Span {
  return startSpan(`${queueName} ${operation}`, {
    kind: operation === 'publish' ? 'producer' : 'consumer',
    attributes: {
      'messaging.system': 'queue',
      'messaging.destination': queueName,
      'messaging.operation': operation,
      ...attributes,
    },
  });
}

/**
 * Create a span for GraphQL operations
 */
export function createGraphQLSpan(
  operationType: 'query' | 'mutation' | 'subscription',
  operationName: string,
  attributes?: SpanAttributes
): Span {
  return startSpan(`graphql.${operationType}`, {
    kind: 'server',
    attributes: {
      'graphql.operation.type': operationType,
      'graphql.operation.name': operationName,
      ...attributes,
    },
  });
}

// =============================================================================
// CONTEXT PROPAGATION
// =============================================================================

/**
 * Extract trace context from incoming headers
 */
export function extractContext(headers: Record<string, string>): Context {
  const getter: TextMapGetter<Record<string, string>> = {
    get(carrier, key) {
      return carrier[key.toLowerCase()];
    },
    keys(carrier) {
      return Object.keys(carrier);
    },
  };

  return propagation.extract(context.active(), headers, getter);
}

/**
 * Inject trace context into outgoing headers
 */
export function injectContext(headers: Record<string, string>): Record<string, string> {
  const setter: TextMapSetter<Record<string, string>> = {
    set(carrier, key, value) {
      carrier[key] = value;
    },
  };

  propagation.inject(context.active(), headers, setter);
  return headers;
}

// =============================================================================
// SPAN UTILITIES
// =============================================================================

/**
 * Add attributes to the active span
 */
export function addSpanAttributes(attributes: SpanAttributes): void {
  const span = getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Record an exception on the active span
 */
export function recordException(error: Error, attributes?: SpanAttributes): void {
  const span = getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    if (attributes) {
      span.setAttributes(attributes);
    }
  }
}

/**
 * Add an event to the active span
 */
export function addSpanEvent(
  name: string,
  attributes?: SpanAttributes,
  timestamp?: number
): void {
  const span = getActiveSpan();
  if (span) {
    span.addEvent(name, attributes, timestamp);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { Span, Tracer, Context, SpanStatusCode };
