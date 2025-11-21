/**
 * OpenTelemetry Tracing Infrastructure Module
 *
 * Drop-in OTEL tracing for distributed tracing across services.
 * Provides standardized hooks for GraphQL, databases, queues, and custom operations.
 *
 * Usage:
 *   import { tracer } from '@/observability/tracing';
 *   const result = await tracer.trace('operation.name', async (span) => {
 *     // Your operation here
 *     span.setAttribute('custom.attr', 'value');
 *     return result;
 *   });
 */

import { trace, context, SpanStatusCode, SpanKind, Span } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import pino from 'pino';

const logger = pino({ name: 'observability:tracing' });

export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  prometheusPort?: number;
  sampleRate: number;
  enabled: boolean;
}

export interface SpanOptions {
  kind?: typeof SpanKind.INTERNAL;
  attributes?: Record<string, any>;
  parentSpan?: Span;
}

/**
 * Centralized OpenTelemetry Tracing Service
 * Singleton pattern for consistent tracing across the application
 */
export class TracingService {
  private static instance: TracingService;
  private sdk: NodeSDK | null = null;
  private tracer: any = null;
  private config: TracingConfig;

  private constructor(config?: Partial<TracingConfig>) {
    this.config = {
      serviceName: config?.serviceName || process.env.OTEL_SERVICE_NAME || 'intelgraph-api',
      serviceVersion: config?.serviceVersion || process.env.OTEL_SERVICE_VERSION || '2.5.0',
      environment: config?.environment || process.env.NODE_ENV || 'development',
      jaegerEndpoint: config?.jaegerEndpoint || process.env.JAEGER_ENDPOINT,
      prometheusPort: config?.prometheusPort || parseInt(process.env.PROMETHEUS_PORT || '9464'),
      sampleRate: config?.sampleRate ?? parseFloat(process.env.OTEL_SAMPLE_RATE || '0.1'),
      enabled: config?.enabled ?? process.env.OTEL_ENABLED !== 'false',
    };

    if (this.config.enabled && process.env.NODE_ENV !== 'test') {
      this.initialize();
    }
  }

  public static getInstance(config?: Partial<TracingConfig>): TracingService {
    if (!TracingService.instance) {
      TracingService.instance = new TracingService(config);
    }
    return TracingService.instance;
  }

  /**
   * Initialize OpenTelemetry SDK with exporters and instrumentation
   */
  private initialize(): void {
    try {
      const resource = Resource.default().merge(
        new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
        }),
      );

      const traceExporter = this.config.jaegerEndpoint
        ? new JaegerExporter({ endpoint: this.config.jaegerEndpoint })
        : undefined;

      const metricReader = new PrometheusExporter({
        port: this.config.prometheusPort,
      });

      this.sdk = new NodeSDK({
        resource,
        traceExporter,
        metricReader,
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': { enabled: false },
          }),
        ],
      });

      this.sdk.start();
      this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);

      logger.info({
        serviceName: this.config.serviceName,
        environment: this.config.environment,
        jaegerEnabled: !!this.config.jaegerEndpoint,
        prometheusPort: this.config.prometheusPort,
      }, 'OpenTelemetry tracing initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize OpenTelemetry');
      this.config.enabled = false;
    }
  }

  /**
   * Generic trace wrapper - wraps any async operation with tracing
   *
   * @example
   * const result = await tracer.trace('database.query', async (span) => {
   *   span.setAttribute('db.statement', query);
   *   return await db.query(query);
   * });
   */
  async trace<T>(
    operationName: string,
    operation: (span: Span) => Promise<T>,
    options: SpanOptions = {},
  ): Promise<T> {
    if (!this.config.enabled || !this.tracer) {
      const noopSpan = this.createNoOpSpan();
      return await operation(noopSpan as Span);
    }

    const span = this.startSpan(operationName, options);

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await operation(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Trace database operations with standardized attributes
   */
  async traceDatabase<T>(
    operation: string,
    dbType: 'postgres' | 'neo4j' | 'redis',
    dbOperation: () => Promise<T>,
    query?: string,
  ): Promise<T> {
    return this.trace(
      `db.${dbType}.${operation}`,
      async (span) => {
        span.setAttribute('db.system', dbType);
        span.setAttribute('db.operation', operation);
        if (query) {
          span.setAttribute('db.statement', query.substring(0, 500)); // Truncate long queries
        }
        return await dbOperation();
      },
      { kind: SpanKind.CLIENT },
    );
  }

  /**
   * Trace GraphQL resolver operations
   */
  async traceGraphQL<T>(
    operationName: string,
    fieldName: string,
    resolver: () => Promise<T>,
    context?: any,
  ): Promise<T> {
    return this.trace(
      `graphql.${operationName}`,
      async (span) => {
        span.setAttribute('graphql.operation.name', operationName);
        span.setAttribute('graphql.field.name', fieldName);
        if (context?.user?.id) {
          span.setAttribute('user.id', context.user.id);
        }
        return await resolver();
      },
      { kind: SpanKind.SERVER },
    );
  }

  /**
   * Trace message queue operations (BullMQ, Kafka, etc.)
   */
  async traceQueue<T>(
    queueName: string,
    jobName: string,
    processor: () => Promise<T>,
  ): Promise<T> {
    return this.trace(
      `queue.${queueName}.${jobName}`,
      async (span) => {
        span.setAttribute('messaging.system', 'redis');
        span.setAttribute('messaging.destination', queueName);
        span.setAttribute('messaging.operation', 'process');
        span.setAttribute('job.name', jobName);
        return await processor();
      },
      { kind: SpanKind.CONSUMER },
    );
  }

  /**
   * Trace HTTP requests
   */
  async traceHTTP<T>(
    method: string,
    url: string,
    httpOperation: () => Promise<T>,
  ): Promise<T> {
    return this.trace(
      `http.${method.toLowerCase()}`,
      async (span) => {
        span.setAttribute('http.method', method);
        span.setAttribute('http.url', url);
        return await httpOperation();
      },
      { kind: SpanKind.CLIENT },
    );
  }

  /**
   * Start a new span manually
   */
  startSpan(name: string, options: SpanOptions = {}): Span {
    if (!this.config.enabled || !this.tracer) {
      return this.createNoOpSpan() as Span;
    }

    return this.tracer.startSpan(name, {
      kind: options.kind || SpanKind.INTERNAL,
      attributes: {
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion,
        'deployment.environment': this.config.environment,
        ...options.attributes,
      },
    });
  }

  /**
   * Get the currently active span
   */
  getActiveSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  /**
   * Add attributes to the active span
   */
  addAttributes(attributes: Record<string, any>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Record an exception in the active span
   */
  recordException(error: Error | string, attributes?: Record<string, any>): void {
    const span = this.getActiveSpan();
    if (span) {
      const errorObj = typeof error === 'string' ? new Error(error) : error;
      span.recordException(errorObj);
      if (attributes) {
        span.setAttributes(attributes);
      }
    }
  }

  /**
   * Get current trace context for propagation (W3C format)
   */
  getTraceContext(): string | undefined {
    const span = this.getActiveSpan();
    if (span) {
      const spanContext = span.spanContext();
      return `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16).padStart(2, '0')}`;
    }
    return undefined;
  }

  /**
   * Get configuration
   */
  getConfig(): TracingConfig {
    return { ...this.config };
  }

  /**
   * Shutdown SDK gracefully
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      logger.info('OpenTelemetry SDK shutdown');
    }
  }

  /**
   * Create no-op span for disabled tracing
   */
  private createNoOpSpan() {
    return {
      setStatus: () => {},
      setAttributes: () => {},
      setAttribute: () => {},
      addEvent: () => {},
      recordException: () => {},
      end: () => {},
      spanContext: () => ({
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
        traceFlags: 0,
      }),
    };
  }
}

// Singleton instance export
export const tracer = TracingService.getInstance();

// Graceful shutdown handlers
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', async () => {
    await tracer.shutdown();
  });

  process.on('SIGINT', async () => {
    await tracer.shutdown();
  });
}

export default tracer;
