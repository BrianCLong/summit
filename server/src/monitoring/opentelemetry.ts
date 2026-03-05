/**
 * OpenTelemetry Instrumentation
 *
 * Replaces custom tracing with industry-standard OpenTelemetry
 * for Apollo GraphQL, Neo4j, and BullMQ operations.
 */

// @ts-ignore
import { NodeSDK } from '@opentelemetry/sdk-node';
// @ts-ignore
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
// @ts-ignore
import { Resource } from '@opentelemetry/resources';
// @ts-ignore
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
// @ts-ignore
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
// @ts-ignore
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
// @ts-ignore
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { trace, context, SpanStatusCode, SpanKind, Span } from '@opentelemetry/api';
import pino from 'pino';

const logger: pino.Logger = (pino as any)({ name: 'opentelemetry' });

interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otlpEndpoint?: string;
  otlpMetricEndpoint?: string;
  enableConsoleExporter: boolean;
  sampleRate: number;
}

class OpenTelemetryService {
  private sdk: NodeSDK | null = null;
  private tracer: any = null;
  private config: TracingConfig;

  constructor(config: Partial<TracingConfig> = {}) {
    this.config = {
      serviceName:
        config.serviceName || process.env.OTEL_SERVICE_NAME || 'intelgraph-api',
      serviceVersion:
        config.serviceVersion || process.env.OTEL_SERVICE_VERSION || '1.0.0',
      environment: config.environment || process.env.NODE_ENV || 'development',
      otlpEndpoint: config.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://otel-collector:4318/v1/traces',
      otlpMetricEndpoint: config.otlpMetricEndpoint || process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://otel-collector:4318/v1/metrics',
      enableConsoleExporter:
        config.enableConsoleExporter ?? process.env.NODE_ENV === 'development',
      sampleRate:
        config.sampleRate ?? parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
    };
  }

  /**
   * Initialize OpenTelemetry SDK
   */
  initialize(): void {
    try {
      // Configure resource
      const resource = Resource.default().merge(
        new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]:
            this.config.serviceVersion,
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
            this.config.environment,
        }),
      );

      // Configure exporters
      const traceExporter = new OTLPTraceExporter({
        url: this.config.otlpEndpoint,
      });

      // Configure metrics
      const metricExporter = new OTLPMetricExporter({
        url: this.config.otlpMetricEndpoint,
      });
      const metricReader = new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 15000, // Export metrics every 15 seconds
      });

      // Initialize SDK
      this.sdk = new NodeSDK({
        resource,
        traceExporter,
        metricReader,
        instrumentations: [
          getNodeAutoInstrumentations({
            // Disable instrumentation for certain modules if needed
            '@opentelemetry/instrumentation-fs': {
              enabled: false,
            },
            '@opentelemetry/instrumentation-http': {
               ignoreIncomingRequestHook: (req: any) => {
                 // Ignore health checks and metrics endpoints to reduce noise
                 return req.url?.includes('/health') || req.url?.includes('/metrics') || false;
               },
            },
          }),
        ],
      });

      // Start the SDK
      this.sdk.start();

      // Get tracer
      this.tracer = trace.getTracer(
        this.config.serviceName,
        this.config.serviceVersion,
      );

      logger.info(
        `OpenTelemetry initialized. Service Name: ${this.config.serviceName}, Environment: ${this.config.environment}, OTLP Traces: ${this.config.otlpEndpoint}, OTLP Metrics: ${this.config.otlpMetricEndpoint}`,
      );
    } catch (error: any) {
      logger.error(
        `Failed to initialize OpenTelemetry. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Shutdown OpenTelemetry SDK
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      logger.info('OpenTelemetry SDK shutdown');
    }
  }

  /**
   * Get the current active span
   */
  getActiveSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  /**
   * Start a new span with proper error handling
   */
  startSpan(
    name: string,
    attributes: Record<string, any> = {},
    kind: typeof SpanKind.INTERNAL = SpanKind.INTERNAL,
  ) {
    if (!this.tracer) {
      return this.createNoOpSpan();
    }

    return this.tracer.startSpan(name, {
      kind,
      attributes: {
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion,
        'deployment.environment': this.config.environment,
        ...attributes,
      },
    });
  }

  /**
   * Wrap a GraphQL resolver with tracing
   */
  wrapResolver<TArgs = any, TResult = any>(
    operationName: string,
    resolver: (
      parent: any,
      args: TArgs,
      context: any,
      info: any,
    ) => Promise<TResult> | TResult,
  ) {
    return async (
      parent: any,
      args: TArgs,
      context: any,
      info: any,
    ): Promise<TResult> => {
      const span = this.startSpan(
        `graphql.${operationName}`,
        {
          'graphql.operation.name': operationName,
          'graphql.operation.type': info.operation?.operation || 'unknown',
          'graphql.field.name': info.fieldName,
          'graphql.field.path': info.path?.key || 'unknown',
          'user.id': context.user?.id || 'anonymous',
        },
        SpanKind.SERVER,
      );

      try {
        const result = await resolver(parent, args, context, info);

        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttributes({
          'graphql.result.success': true,
        });

        return result;
      } catch (error: any) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });

        span.setAttributes({
          'graphql.result.success': false,
          'error.name':
            error instanceof Error ? error.constructor.name : 'Unknown',
          'error.message':
            error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      } finally {
        span.end();
      }
    };
  }

  /**
   * Wrap Neo4j operations with tracing
   */
  wrapNeo4jOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const span = this.startSpan(
      `neo4j.${operationName}`,
      {
        'db.system': 'neo4j',
        'db.operation': operationName,
      },
      SpanKind.CLIENT,
    );

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await operation();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error: any) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Wrap BullMQ job processing with tracing
   */
  wrapBullMQJob<T>(jobName: string, processor: () => Promise<T>): Promise<T> {
    const span = this.startSpan(
      `bullmq.${jobName}`,
      {
        'messaging.system': 'redis',
        'messaging.operation': 'process',
        'job.name': jobName,
      },
      SpanKind.CONSUMER,
    );

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await processor();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error: any) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Add custom span attributes
   */
  addSpanAttributes(attributes: Record<string, any>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }

  /**
   * Add span event
   */
  addSpanEvent(name: string, attributes?: Record<string, any>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  }

  /**
   * Get current trace context for propagation
   */
  getCurrentTraceContext(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      return `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16)}`;
    }
    return undefined;
  }

  /**
   * Create no-op span for when tracing is disabled
   */
  private createNoOpSpan() {
    return {
      setStatus: () => {},
      setAttributes: () => {},
      addEvent: () => {},
      end: () => {},
      isRecording: () => false,
      spanContext: () => ({ traceId: '', spanId: '', traceFlags: 0 }),
    };
  }

  /**
   * Get service health and metrics
   */
  getHealth(): {
    enabled: boolean;
    serviceName: string;
    environment: string;
    tracerActive: boolean;
  } {
    return {
      enabled: !!this.sdk,
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      tracerActive: !!this.tracer,
    };
  }
}

// Global instance
export const otelService = new OpenTelemetryService();

// Initialize if not in test environment
if (process.env.NODE_ENV !== 'test') {
  otelService.initialize();
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await otelService.shutdown();
});

process.on('SIGINT', async () => {
  await otelService.shutdown();
});

export default otelService;
