/**
 * OpenTelemetry Instrumentation
 *
 * Wrapper around the core observability/tracer to provide backward compatibility
 * and specialized wrapping methods.
 */

import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import pino from 'pino';
import { getTracer, initializeTracing } from '../observability/tracer.js';

const logger: pino.Logger = (pino as any)({ name: 'opentelemetry' });

interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  enableConsoleExporter: boolean;
  sampleRate: number;
}

class OpenTelemetryService {
  private config: TracingConfig;

  constructor(config: Partial<TracingConfig> = {}) {
    this.config = {
      serviceName:
        config.serviceName || process.env.OTEL_SERVICE_NAME || 'intelgraph-api',
      serviceVersion:
        config.serviceVersion || process.env.OTEL_SERVICE_VERSION || '1.0.0',
      environment: config.environment || process.env.NODE_ENV || 'development',
      jaegerEndpoint: config.jaegerEndpoint || process.env.JAEGER_ENDPOINT,
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
      const tracer = initializeTracing({
        serviceName: this.config.serviceName,
        serviceVersion: this.config.serviceVersion,
        environment: this.config.environment,
        jaegerEndpoint: this.config.jaegerEndpoint,
        sampleRate: this.config.sampleRate
      });
      tracer.initialize();
      logger.info('OpenTelemetry initialized via core tracer');
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
    const tracer = getTracer();
    await tracer.shutdown();
    logger.info('OpenTelemetry SDK shutdown');
  }

  /**
   * Start a new span with proper error handling
   */
  startSpan(
    name: string,
    attributes: Record<string, any> = {},
    kind: typeof SpanKind.INTERNAL = SpanKind.INTERNAL,
  ) {
    const tracer = getTracer();
    return tracer.startSpan(name, {
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
   * Get service health and metrics
   */
  getHealth(): {
    enabled: boolean;
    serviceName: string;
    environment: string;
    tracerActive: boolean;
  } {
    const tracer = getTracer();
    return {
      enabled: tracer.isInitialized(),
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      tracerActive: tracer.isInitialized(),
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
