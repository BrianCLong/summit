/**
 * P32: Distributed Tracing SDK
 * OpenTelemetry-based tracing for Summit platform
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SemanticResourceAttributes,
  SemanticAttributes,
} from '@opentelemetry/semantic-conventions';
import {
  trace,
  context,
  SpanKind,
  SpanStatusCode,
  propagation,
  Span,
  Tracer,
  Context,
  SpanOptions,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { z } from 'zod';

/**
 * Tracing configuration schema
 */
export const TracingConfigSchema = z.object({
  serviceName: z.string(),
  serviceVersion: z.string().default('1.0.0'),
  environment: z.string().default('development'),
  enabled: z.boolean().default(true),
  samplingRate: z.number().min(0).max(1).default(1.0),
  exporterEndpoint: z.string().optional(),
  exporterHeaders: z.record(z.string()).optional(),
  instrumentations: z.object({
    http: z.boolean().default(true),
    express: z.boolean().default(true),
    graphql: z.boolean().default(true),
    pg: z.boolean().default(true),
    redis: z.boolean().default(true),
  }).default({}),
});

export type TracingConfig = z.infer<typeof TracingConfigSchema>;

/**
 * Summit-specific span attributes
 */
export const SummitAttributes = {
  // User context
  USER_ID: 'summit.user.id',
  USER_ROLE: 'summit.user.role',
  SESSION_ID: 'summit.session.id',

  // Investigation context
  INVESTIGATION_ID: 'summit.investigation.id',
  INVESTIGATION_TYPE: 'summit.investigation.type',

  // Entity context
  ENTITY_ID: 'summit.entity.id',
  ENTITY_TYPE: 'summit.entity.type',

  // Graph context
  GRAPH_PATTERN: 'summit.graph.pattern',
  GRAPH_DEPTH: 'summit.graph.depth',
  NODES_VISITED: 'summit.graph.nodes_visited',
  RELATIONSHIPS_FOLLOWED: 'summit.graph.relationships_followed',

  // Cache context
  CACHE_HIT: 'summit.cache.hit',
  CACHE_LAYER: 'summit.cache.layer',

  // AI/Copilot context
  COPILOT_ACTION: 'summit.copilot.action',
  COPILOT_MODEL: 'summit.copilot.model',
  COPILOT_TOKENS: 'summit.copilot.tokens',

  // Error context
  ERROR_CODE: 'summit.error.code',
  ERROR_MESSAGE: 'summit.error.message',
} as const;

let sdk: NodeSDK | null = null;
let globalTracer: Tracer | null = null;

/**
 * Initialize the tracing SDK
 */
export function initializeTracing(config: Partial<TracingConfig>): NodeSDK {
  const validatedConfig = TracingConfigSchema.parse(config);

  if (!validatedConfig.enabled) {
    return null as unknown as NodeSDK;
  }

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: validatedConfig.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: validatedConfig.serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: validatedConfig.environment,
  });

  const exporter = validatedConfig.exporterEndpoint
    ? new OTLPTraceExporter({
        url: validatedConfig.exporterEndpoint,
        headers: validatedConfig.exporterHeaders,
      })
    : undefined;

  const instrumentations = getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-http': {
      enabled: validatedConfig.instrumentations.http,
    },
    '@opentelemetry/instrumentation-express': {
      enabled: validatedConfig.instrumentations.express,
    },
    '@opentelemetry/instrumentation-graphql': {
      enabled: validatedConfig.instrumentations.graphql,
    },
    '@opentelemetry/instrumentation-pg': {
      enabled: validatedConfig.instrumentations.pg,
    },
    '@opentelemetry/instrumentation-redis-4': {
      enabled: validatedConfig.instrumentations.redis,
    },
    // Disable noisy instrumentations
    '@opentelemetry/instrumentation-fs': { enabled: false },
    '@opentelemetry/instrumentation-dns': { enabled: false },
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: exporter,
    instrumentations,
    sampler: {
      shouldSample: () => ({
        decision: Math.random() < validatedConfig.samplingRate ? 1 : 0,
        attributes: {},
        traceState: undefined,
      }),
    },
  });

  // Set up W3C trace context propagation
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());

  sdk.start();
  globalTracer = trace.getTracer(validatedConfig.serviceName, validatedConfig.serviceVersion);

  return sdk;
}

/**
 * Shutdown the tracing SDK
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    globalTracer = null;
  }
}

/**
 * Get the global tracer
 */
export function getTracer(): Tracer {
  if (!globalTracer) {
    globalTracer = trace.getTracer('summit-default');
  }
  return globalTracer;
}

/**
 * Create a new span with Summit conventions
 */
export function createSpan(
  name: string,
  options: SpanOptions & { attributes?: Record<string, string | number | boolean> } = {}
): Span {
  const tracer = getTracer();
  return tracer.startSpan(name, options);
}

/**
 * Run a function within a span context
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options: SpanOptions & { attributes?: Record<string, string | number | boolean> } = {}
): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(name, options);

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add attributes to the current span
 */
export function setSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  const span = trace.getSpan(context.active());
  if (span) {
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value);
    }
  }
}

/**
 * Record an error on the current span
 */
export function recordSpanError(error: Error, attributes?: Record<string, string>): void {
  const span = trace.getSpan(context.active());
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        span.setAttribute(key, value);
      }
    }
  }
}

/**
 * Get current trace context for propagation
 */
export function getTraceContext(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

/**
 * Extract trace context from carrier
 */
export function extractTraceContext(carrier: Record<string, string>): Context {
  return propagation.extract(context.active(), carrier);
}

/**
 * Higher-order function to trace a function
 */
export function traced<TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => Promise<TResult>,
  options?: SpanOptions
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return withSpan(name, async (span) => {
      // Add function arguments as attributes (be careful with sensitive data)
      span.setAttribute('function.args_count', args.length);
      return fn(...args);
    }, options);
  };
}

/**
 * Decorator for tracing class methods
 */
export function Trace(name?: string, options?: SpanOptions) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const spanName = name || `${(target as { constructor: { name: string } }).constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: unknown[]) {
      return withSpan(spanName, async (span) => {
        span.setAttribute('class', (target as { constructor: { name: string } }).constructor.name);
        span.setAttribute('method', propertyKey);
        return originalMethod.apply(this, args);
      }, options);
    };

    return descriptor;
  };
}

/**
 * Pre-configured span helpers for common operations
 */
export const spans = {
  /**
   * Create a database query span
   */
  dbQuery(database: string, operation: string): (fn: (span: Span) => Promise<unknown>) => Promise<unknown> {
    return (fn) => withSpan(`db.${operation}`, fn, {
      kind: SpanKind.CLIENT,
      attributes: {
        [SemanticAttributes.DB_SYSTEM]: database,
        [SemanticAttributes.DB_OPERATION]: operation,
      },
    });
  },

  /**
   * Create an HTTP request span
   */
  httpRequest(method: string, url: string): (fn: (span: Span) => Promise<unknown>) => Promise<unknown> {
    return (fn) => withSpan(`HTTP ${method}`, fn, {
      kind: SpanKind.CLIENT,
      attributes: {
        [SemanticAttributes.HTTP_METHOD]: method,
        [SemanticAttributes.HTTP_URL]: url,
      },
    });
  },

  /**
   * Create a graph traversal span
   */
  graphTraversal(pattern: string, depth: number): (fn: (span: Span) => Promise<unknown>) => Promise<unknown> {
    return (fn) => withSpan('graph.traversal', fn, {
      kind: SpanKind.INTERNAL,
      attributes: {
        [SummitAttributes.GRAPH_PATTERN]: pattern,
        [SummitAttributes.GRAPH_DEPTH]: depth,
      },
    });
  },

  /**
   * Create a cache operation span
   */
  cacheOperation(operation: string, layer: string): (fn: (span: Span) => Promise<unknown>) => Promise<unknown> {
    return (fn) => withSpan(`cache.${operation}`, fn, {
      kind: SpanKind.CLIENT,
      attributes: {
        [SummitAttributes.CACHE_LAYER]: layer,
      },
    });
  },

  /**
   * Create a copilot request span
   */
  copilotRequest(action: string, model: string): (fn: (span: Span) => Promise<unknown>) => Promise<unknown> {
    return (fn) => withSpan('copilot.request', fn, {
      kind: SpanKind.CLIENT,
      attributes: {
        [SummitAttributes.COPILOT_ACTION]: action,
        [SummitAttributes.COPILOT_MODEL]: model,
      },
    });
  },
};
