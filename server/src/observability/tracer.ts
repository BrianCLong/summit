/**
 * OpenTelemetry Distributed Tracing for IntelGraph Server
 * Provides end-to-end visibility across all service operations
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import {
  trace,
  context,
  propagation,
  SpanStatusCode,
  SpanKind,
  Span,
  Context,
} from '@opentelemetry/api';
import { cfg } from '../config.js';
import pino from 'pino';

const logger = pino({ name: 'otel-tracer' });

export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  enableAutoInstrumentation?: boolean;
  sampleRate?: number;
}

export class IntelGraphTracer {
  private sdk: NodeSDK | null = null;
  private tracer: any;
  private initialized = false;

  constructor(private config: TracingConfig) {
    this.tracer = trace.getTracer(
      this.config.serviceName,
      this.config.serviceVersion,
    );
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Tracer already initialized');
      return;
    }

    try {
      // Create resource with service metadata
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
          this.config.environment,
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'intelgraph',
      });

      // Configure Jaeger exporter if endpoint provided
      const exporters: any[] = [];
      if (this.config.jaegerEndpoint) {
        exporters.push(
          new JaegerExporter({
            endpoint: this.config.jaegerEndpoint,
          }),
        );
        logger.info(`Jaeger exporter configured: ${this.config.jaegerEndpoint}`);
      }

      // Initialize OpenTelemetry SDK
      this.sdk = new NodeSDK({
        resource,
        traceExporter: exporters.length > 0 ? exporters[0] : undefined,
        instrumentations:
          this.config.enableAutoInstrumentation !== false
            ? [
                getNodeAutoInstrumentations({
                  '@opentelemetry/instrumentation-fs': {
                    enabled: false, // Disable fs instrumentation (too noisy)
                  },
                  '@opentelemetry/instrumentation-http': {
                    enabled: true,
                    requestHook: (span, request) => {
                      // Add custom HTTP span attributes
                      span.setAttribute('http.client_ip', request.socket.remoteAddress || 'unknown');
                    },
                  },
                  '@opentelemetry/instrumentation-express': {
                    enabled: true,
                  },
                  '@opentelemetry/instrumentation-graphql': {
                    enabled: true,
                  },
                }),
              ]
            : [],
      });

      await this.sdk.start();
      this.initialized = true;
      logger.info('OpenTelemetry tracing initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize tracing:', error);
      // Don't throw - allow service to start without tracing
    }
  }

  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.initialized = false;
      logger.info('OpenTelemetry tracing shut down');
    }
  }

  // Start a new span
  startSpan(
    name: string,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, any>;
      parent?: Span | Context;
    },
  ): Span {
    const spanOptions: any = {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes || {},
    };

    if (options?.parent) {
      return this.tracer.startSpan(
        name,
        spanOptions,
        typeof options.parent === 'object' && 'spanContext' in options.parent
          ? trace.setSpan(context.active(), options.parent)
          : options.parent,
      );
    }

    return this.tracer.startSpan(name, spanOptions);
  }

  // Execute function within a span context
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, any>;
    },
  ): Promise<T> {
    const span = this.startSpan(name, options);

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        () => fn(span),
      );
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
  }

  // Get current active span
  getCurrentSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  // Add event to current span
  addEvent(name: string, attributes?: Record<string, any>): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  // Set attribute on current span
  setAttribute(key: string, value: any): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.setAttribute(key, value);
    }
  }

  // Record exception in current span
  recordException(error: Error): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  // Extract trace context from headers
  extractContext(headers: Record<string, any>): Context {
    return propagation.extract(context.active(), headers);
  }

  // Inject trace context into headers
  injectContext(headers: Record<string, any>): void {
    propagation.inject(context.active(), headers);
  }

  // Get trace ID for logging correlation
  getTraceId(): string {
    const span = this.getCurrentSpan();
    if (span) {
      return span.spanContext().traceId;
    }
    return '';
  }

  // Get span ID for logging correlation
  getSpanId(): string {
    const span = this.getCurrentSpan();
    if (span) {
      return span.spanContext().spanId;
    }
    return '';
  }

  // Database query tracing helper
  async traceDbQuery<T>(
    database: string,
    operation: string,
    query: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.withSpan(
      `db.${database}.${operation}`,
      async (span) => {
        span.setAttributes({
          'db.system': database,
          'db.operation': operation,
          'db.statement': query.length > 500 ? query.substring(0, 500) + '...' : query,
        });
        return fn();
      },
      { kind: SpanKind.CLIENT },
    );
  }

  // Cache operation tracing helper
  async traceCacheOperation<T>(
    operation: string,
    key: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.withSpan(
      `cache.${operation}`,
      async (span) => {
        span.setAttributes({
          'cache.operation': operation,
          'cache.key': key,
        });
        const result = await fn();
        span.setAttribute('cache.hit', result !== null && result !== undefined);
        return result;
      },
      { kind: SpanKind.CLIENT },
    );
  }

  // Service method tracing helper
  async traceServiceMethod<T>(
    serviceName: string,
    methodName: string,
    fn: () => Promise<T>,
    parameters?: Record<string, any>,
  ): Promise<T> {
    return this.withSpan(
      `${serviceName}.${methodName}`,
      async (span) => {
        span.setAttributes({
          'service.name': serviceName,
          'service.method': methodName,
          ...(parameters && { 'service.parameters': JSON.stringify(parameters) }),
        });
        return fn();
      },
      { kind: SpanKind.INTERNAL },
    );
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
let tracerInstance: IntelGraphTracer | null = null;

export function initializeTracing(config?: Partial<TracingConfig>): IntelGraphTracer {
  if (tracerInstance) {
    return tracerInstance;
  }

  const defaultConfig: TracingConfig = {
    serviceName: 'intelgraph-server',
    serviceVersion: cfg.APP_VERSION || '1.0.0',
    environment: cfg.NODE_ENV || 'development',
    jaegerEndpoint: process.env.JAEGER_ENDPOINT,
    enableAutoInstrumentation: process.env.OTEL_AUTO_INSTRUMENT !== 'false',
    sampleRate: parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
  };

  tracerInstance = new IntelGraphTracer({ ...defaultConfig, ...config });
  return tracerInstance;
}

export function getTracer(): IntelGraphTracer {
  if (!tracerInstance) {
    // Auto-initialize with defaults if not initialized
    return initializeTracing();
  }
  return tracerInstance;
}

// Decorator for automatic method tracing
export function traced(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const traceName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const tracer = getTracer();
      return tracer.withSpan(traceName, async () => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

export { SpanKind, SpanStatusCode };
