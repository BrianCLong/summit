import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { trace, context, SpanKind, SpanStatusCode, Span } from '@opentelemetry/api';

// Configure diagnostic logging
if (process.env.OTEL_DEBUG === 'true') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

// Service information
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'sandbox-gateway';
const SERVICE_VERSION = process.env.npm_package_version || '1.0.0';
const DEPLOYMENT_ENV = process.env.NODE_ENV || 'development';

// OTLP endpoint
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';

// Create resource
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  [SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: DEPLOYMENT_ENV,
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'intelgraph',
  'service.component': 'sandbox',
});

// Create trace exporter
const traceExporter = new OTLPTraceExporter({
  url: OTLP_ENDPOINT,
});

// Create metric exporter
const metricExporter = new OTLPMetricExporter({
  url: OTLP_ENDPOINT,
});

// Create metric reader
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 60000,
});

// Initialize SDK
let sdk: NodeSDK | null = null;

export function initTracing(): void {
  if (sdk) {
    return; // Already initialized
  }

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    textMapPropagator: new W3CTraceContextPropagator(),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable file system instrumentation for performance
        },
      }),
      new HttpInstrumentation({
        ignoreIncomingPaths: ['/health', '/health/live', '/health/ready', '/metrics'],
        requestHook: (span, request) => {
          span.setAttribute('http.request.id', request.headers['x-request-id'] as string || 'unknown');
        },
      }),
      new ExpressInstrumentation({
        ignoreLayers: [],
        ignoreLayersType: [],
      }),
      new GraphQLInstrumentation({
        depth: 5,
        mergeItems: true,
        allowValues: process.env.NODE_ENV !== 'production',
      }),
      new PinoInstrumentation({
        logHook: (span, record) => {
          record['trace_id'] = span.spanContext().traceId;
          record['span_id'] = span.spanContext().spanId;
        },
      }),
    ],
  });

  sdk.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk?.shutdown().catch(console.error);
  });
}

export function shutdownTracing(): Promise<void> {
  if (!sdk) {
    return Promise.resolve();
  }
  return sdk.shutdown();
}

// Get tracer for custom spans
export function getTracer() {
  return trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
}

// Helper to create custom spans
export interface SpanOptions {
  name: string;
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
}

export async function withSpan<T>(
  options: SpanOptions,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = getTracer();

  return tracer.startActiveSpan(
    options.name,
    {
      kind: options.kind || SpanKind.INTERNAL,
      attributes: options.attributes,
    },
    async (span) => {
      try {
        const result = await fn(span);
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
  );
}

// Sandbox-specific tracing helpers
export const SandboxSpans = {
  createSandbox: (sandboxId: string, userId: string) => ({
    name: 'sandbox.create',
    kind: SpanKind.INTERNAL,
    attributes: {
      'sandbox.id': sandboxId,
      'sandbox.user_id': userId,
      'sandbox.operation': 'create',
    },
  }),

  enforcementCheck: (sandboxId: string, operation: string) => ({
    name: 'sandbox.enforcement.check',
    kind: SpanKind.INTERNAL,
    attributes: {
      'sandbox.id': sandboxId,
      'sandbox.operation': operation,
      'enforcement.type': 'policy',
    },
  }),

  linkbackAttempt: (sandboxId: string, targetId: string, blocked: boolean) => ({
    name: 'sandbox.linkback.attempt',
    kind: SpanKind.INTERNAL,
    attributes: {
      'sandbox.id': sandboxId,
      'linkback.target_id': targetId,
      'linkback.blocked': blocked,
    },
  }),

  dataClone: (sandboxId: string, strategy: string, sourceType: string) => ({
    name: 'datalab.clone',
    kind: SpanKind.INTERNAL,
    attributes: {
      'sandbox.id': sandboxId,
      'clone.strategy': strategy,
      'clone.source_type': sourceType,
    },
  }),

  syntheticDataGeneration: (sandboxId: string, entityCount: number) => ({
    name: 'datalab.synthetic.generate',
    kind: SpanKind.INTERNAL,
    attributes: {
      'sandbox.id': sandboxId,
      'synthetic.entity_count': entityCount,
    },
  }),

  promotionRequest: (sandboxId: string, targetTenantId: string, promotionType: string) => ({
    name: 'sandbox.promotion.request',
    kind: SpanKind.INTERNAL,
    attributes: {
      'sandbox.id': sandboxId,
      'promotion.target_tenant_id': targetTenantId,
      'promotion.type': promotionType,
    },
  }),

  promotionExecution: (requestId: string) => ({
    name: 'sandbox.promotion.execute',
    kind: SpanKind.INTERNAL,
    attributes: {
      'promotion.request_id': requestId,
      'promotion.operation': 'execute',
    },
  }),
};

// Context propagation helper
export function extractTraceContext(headers: Record<string, string | string[] | undefined>) {
  return context.active();
}

// Add trace ID to response headers
export function injectTraceHeaders(headers: Record<string, string>) {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    const spanContext = activeSpan.spanContext();
    headers['x-trace-id'] = spanContext.traceId;
    headers['x-span-id'] = spanContext.spanId;
  }
  return headers;
}
