/**
 * OpenTelemetry Instrumentation Helper
 *
 * Provides helper methods for tracing, using the globally initialized OpenTelemetry SDK.
 * Note: SDK initialization is handled in `server_entry.ts` via `observability/tracer.ts`.
 */

import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import pino from 'pino';

const logger: pino.Logger = (pino as any)({ name: 'opentelemetry' });

interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
}

class OpenTelemetryService {
  private config: TracingConfig;

  constructor() {
    this.config = {
      serviceName: process.env.OTEL_SERVICE_NAME || 'intelgraph-api',
      serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  // No-op initialize as SDK is initialized globally
  initialize(): void {
    logger.info('OpenTelemetryService wrapper initialized (relying on global SDK)');
  }

  // No-op shutdown as SDK is managed globally
  async shutdown(): Promise<void> {
    // No-op
  }

  private getTracer() {
    return trace.getTracer(
      this.config.serviceName,
      this.config.serviceVersion
    );
  }

  /**
   * Start a new span with proper error handling
   */
  startSpan(
    name: string,
    attributes: Record<string, any> = {},
    kind: typeof SpanKind.INTERNAL = SpanKind.INTERNAL,
  ) {
    const tracer = this.getTracer();
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
   * Create no-op span for when tracing is disabled
   */
  private createNoOpSpan() {
    return {
      setStatus: () => {},
      setAttributes: () => {},
      addEvent: () => {},
      end: () => {},
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
      enabled: true,
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      tracerActive: true,
    };
  }
}

// Global instance
export const otelService = new OpenTelemetryService();

export default otelService;
