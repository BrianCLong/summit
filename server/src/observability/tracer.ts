/**
 * OpenTelemetry Distributed Tracing for IntelGraph Server
 * Provides end-to-end visibility across all service operations
 */

import { cfg } from '../config.js';
import pino from 'pino';

// Use dynamic imports to avoid ESM/CJS type issues
let opentelemetryApi: any = null;

const logger = pino({ name: 'otel-tracer' });

// Re-export commonly used constants (populated after init)
export let SpanKind: any = {
  INTERNAL: 0,
  SERVER: 1,
  CLIENT: 2,
  PRODUCER: 3,
  CONSUMER: 4,
};

export let SpanStatusCode: any = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
};

export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  enableAutoInstrumentation?: boolean;
  sampleRate?: number;
}

export class IntelGraphTracer {
  private sdk: any = null;
  private tracer: any = null;
  private initialized = false;
  private apiLoaded = false;

  constructor(private config: TracingConfig) {}

  private async loadApi(): Promise<void> {
    if (this.apiLoaded) return;

    try {
      opentelemetryApi = await import('@opentelemetry/api');
      SpanKind = opentelemetryApi.SpanKind;
      SpanStatusCode = opentelemetryApi.SpanStatusCode;

      this.tracer = opentelemetryApi.trace.getTracer(
        this.config.serviceName,
        this.config.serviceVersion,
      );
      this.apiLoaded = true;
    } catch (error) {
      logger.warn({ error: (error as Error).message }, 'Failed to load OpenTelemetry API');
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Tracer already initialized');
      return;
    }

    await this.loadApi();

    try {
      // Dynamic imports for SDK components to avoid ESM/CJS issues
      const [sdkModule, resourceModule, semconvModule, jaegerModule, autoInstModule] =
        await Promise.all([
          import('@opentelemetry/sdk-node').catch(() => null),
          import('@opentelemetry/resources').catch(() => null),
          import('@opentelemetry/semantic-conventions').catch(() => null),
          import('@opentelemetry/exporter-jaeger').catch(() => null),
          import('@opentelemetry/auto-instrumentations-node').catch(() => null),
        ]);

      if (!sdkModule || !resourceModule || !semconvModule) {
        logger.warn('OpenTelemetry SDK modules not available, tracing disabled');
        return;
      }

      const { NodeSDK } = sdkModule;
      const { Resource } = resourceModule;

      // Get semantic attribute names (handle different versions)
      const serviceName =
        (semconvModule as any).SEMRESATTRS_SERVICE_NAME ||
        (semconvModule as any).SemanticResourceAttributes?.SERVICE_NAME ||
        'service.name';
      const serviceVersion =
        (semconvModule as any).SEMRESATTRS_SERVICE_VERSION ||
        (semconvModule as any).SemanticResourceAttributes?.SERVICE_VERSION ||
        'service.version';
      const deploymentEnv =
        (semconvModule as any).SEMRESATTRS_DEPLOYMENT_ENVIRONMENT ||
        (semconvModule as any).SemanticResourceAttributes?.DEPLOYMENT_ENVIRONMENT ||
        'deployment.environment';

      // Create resource with service metadata
      const resource = new Resource({
        [serviceName]: this.config.serviceName,
        [serviceVersion]: this.config.serviceVersion,
        [deploymentEnv]: this.config.environment,
        'service.namespace': 'intelgraph',
      });

      // Configure Jaeger exporter if endpoint provided
      let traceExporter: any = undefined;
      if (this.config.jaegerEndpoint && jaegerModule) {
        const { JaegerExporter } = jaegerModule;
        traceExporter = new JaegerExporter({
          endpoint: this.config.jaegerEndpoint,
        });
        logger.info(`Jaeger exporter configured: ${this.config.jaegerEndpoint}`);
      }

      // Get auto instrumentations if available
      const instrumentations: any[] = [];
      if (this.config.enableAutoInstrumentation !== false && autoInstModule) {
        const { getNodeAutoInstrumentations } = autoInstModule;
        instrumentations.push(
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': { enabled: false },
            '@opentelemetry/instrumentation-http': { enabled: true },
            '@opentelemetry/instrumentation-express': { enabled: true },
            '@opentelemetry/instrumentation-graphql': { enabled: true },
          }),
        );
      }

      // Initialize OpenTelemetry SDK
      this.sdk = new NodeSDK({
        resource,
        traceExporter,
        instrumentations,
      });

      await this.sdk.start();
      this.initialized = true;
      logger.info('OpenTelemetry tracing initialized successfully');
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to initialize tracing');
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
  startSpan(name: string, options?: { kind?: any; attributes?: Record<string, any>; parent?: any }): any {
    if (!this.tracer || !opentelemetryApi) {
      return createNoopSpan();
    }

    const spanOptions: any = {
      kind: options?.kind ?? SpanKind.INTERNAL,
      attributes: options?.attributes || {},
    };

    if (options?.parent) {
      const parentContext =
        typeof options.parent?.spanContext === 'function'
          ? opentelemetryApi.trace.setSpan(opentelemetryApi.context.active(), options.parent)
          : options.parent;
      return this.tracer.startSpan(name, spanOptions, parentContext);
    }

    return this.tracer.startSpan(name, spanOptions);
  }

  // Execute function within a span context
  async withSpan<T>(
    name: string,
    fn: (span: any) => Promise<T>,
    options?: { kind?: any; attributes?: Record<string, any> },
  ): Promise<T> {
    const span = this.startSpan(name, options);

    try {
      let result: T;
      if (opentelemetryApi) {
        result = await opentelemetryApi.context.with(
          opentelemetryApi.trace.setSpan(opentelemetryApi.context.active(), span),
          () => fn(span),
        );
      } else {
        result = await fn(span);
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      if (typeof span.recordException === 'function') {
        span.recordException(error as Error);
      }
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
  getCurrentSpan(): any {
    if (!opentelemetryApi) return undefined;
    return opentelemetryApi.trace.getActiveSpan();
  }

  // Add event to current span
  addEvent(name: string, attributes?: Record<string, any>): void {
    const span = this.getCurrentSpan();
    if (span?.addEvent) {
      span.addEvent(name, attributes);
    }
  }

  // Set attribute on current span
  setAttribute(key: string, value: any): void {
    const span = this.getCurrentSpan();
    if (span?.setAttribute) {
      span.setAttribute(key, value);
    }
  }

  // Record exception in current span
  recordException(error: Error): void {
    const span = this.getCurrentSpan();
    if (span) {
      if (span.recordException) span.recordException(error);
      span.setStatus?.({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  // Extract trace context from headers
  extractContext(headers: Record<string, any>): any {
    if (!opentelemetryApi) return {};
    return opentelemetryApi.propagation.extract(opentelemetryApi.context.active(), headers);
  }

  // Inject trace context into headers
  injectContext(headers: Record<string, any>): void {
    if (!opentelemetryApi) return;
    opentelemetryApi.propagation.inject(opentelemetryApi.context.active(), headers);
  }

  // Get trace ID for logging correlation
  getTraceId(): string {
    const span = this.getCurrentSpan();
    if (span?.spanContext) {
      return span.spanContext().traceId || '';
    }
    return '';
  }

  // Get span ID for logging correlation
  getSpanId(): string {
    const span = this.getCurrentSpan();
    if (span?.spanContext) {
      return span.spanContext().spanId || '';
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
        span.setAttributes?.({
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
  async traceCacheOperation<T>(operation: string, key: string, fn: () => Promise<T>): Promise<T> {
    return this.withSpan(
      `cache.${operation}`,
      async (span) => {
        span.setAttributes?.({
          'cache.operation': operation,
          'cache.key': key,
        });
        const result = await fn();
        span.setAttribute?.('cache.hit', result !== null && result !== undefined);
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
        span.setAttributes?.({
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

// Create a no-op span for when tracing is disabled
function createNoopSpan(): any {
  return {
    setAttribute: () => {},
    setAttributes: () => {},
    addEvent: () => {},
    setStatus: () => {},
    recordException: () => {},
    end: () => {},
    spanContext: () => ({ traceId: '', spanId: '' }),
    isRecording: () => false,
  };
}

// Singleton instance
let tracerInstance: IntelGraphTracer | null = null;

export function initializeTracing(config?: Partial<TracingConfig>): IntelGraphTracer {
  if (tracerInstance) {
    return tracerInstance;
  }

  const defaultConfig: TracingConfig = {
    serviceName: 'intelgraph-server',
    serviceVersion: (cfg as any).APP_VERSION || '1.0.0',
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
    return initializeTracing();
  }
  return tracerInstance;
}

// Decorator for automatic method tracing
export function traced(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
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
