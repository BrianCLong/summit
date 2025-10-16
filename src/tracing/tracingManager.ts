/**
 * Distributed Tracing Manager for IntelGraph
 * OpenTelemetry-based tracing with performance profiling and service dependency mapping
 */

import {
  trace,
  context,
  SpanKind,
  SpanStatusCode,
  Span,
} from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface TraceConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  exporters: {
    jaeger?: {
      enabled: boolean;
      endpoint?: string;
      headers?: Record<string, string>;
    };
    zipkin?: {
      enabled: boolean;
      endpoint?: string;
      headers?: Record<string, string>;
    };
    otlp?: {
      enabled: boolean;
      endpoint?: string;
      headers?: Record<string, string>;
    };
  };
  sampling: {
    ratio: number; // 0.0 to 1.0
    rulesBased?: SamplingRule[];
  };
  performance: {
    enableProfiling: boolean;
    slowSpanThreshold: number; // milliseconds
    memoryProfiling: boolean;
  };
  customAttributes: Record<string, string>;
}

export interface SamplingRule {
  serviceName?: string;
  operationName?: string;
  traceState?: Record<string, string>;
  samplingRatio: number;
}

export interface SpanMetrics {
  spanId: string;
  traceId: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'ok' | 'error' | 'timeout';
  tags: Record<string, any>;
  logs: SpanLog[];
}

export interface SpanLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  fields?: Record<string, any>;
}

export interface ServiceTopology {
  services: ServiceNode[];
  dependencies: ServiceDependency[];
  metrics: TopologyMetrics;
}

export interface ServiceNode {
  name: string;
  version: string;
  environment: string;
  endpoints: string[];
  health: 'healthy' | 'degraded' | 'unhealthy';
  metrics: {
    requestRate: number;
    errorRate: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
  };
}

export interface ServiceDependency {
  caller: string;
  callee: string;
  callRate: number;
  errorRate: number;
  avgLatency: number;
  weight: number; // Relative importance of this dependency
}

export interface TopologyMetrics {
  totalServices: number;
  totalDependencies: number;
  healthyServices: number;
  criticalPaths: string[][];
  bottlenecks: string[];
}

export class TracingManager extends EventEmitter {
  private sdk: NodeSDK;
  private tracer: any;
  private config: TraceConfig;
  private spanMetrics: Map<string, SpanMetrics> = new Map();
  private serviceTopology: ServiceTopology;
  private performanceProfiler: PerformanceProfiler;

  constructor(config: TraceConfig) {
    super();
    this.config = config;
    this.performanceProfiler = new PerformanceProfiler(config.performance);
    this.initializeTracing();
    this.setupMetricsCollection();
  }

  /**
   * Initialize OpenTelemetry tracing
   */
  private initializeTracing(): void {
    // Create resource with service information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
        this.config.environment,
      ...this.config.customAttributes,
    });

    // Configure exporters
    const spanProcessors = this.createSpanProcessors();

    // Initialize SDK with auto-instrumentations
    this.sdk = new NodeSDK({
      resource,
      spanProcessors,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            requestHook: (span, request) => {
              this.enhanceHttpSpan(span, request);
            },
            responseHook: (span, response) => {
              this.enhanceHttpResponse(span, response);
            },
          },
          '@opentelemetry/instrumentation-express': {
            requestHook: (span, info) => {
              this.enhanceExpressSpan(span, info);
            },
          },
          '@opentelemetry/instrumentation-graphql': {
            enabled: true,
            mergeItems: true,
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
            dbStatementSerializer: (cmdName, cmdArgs) => {
              return `${cmdName} ${cmdArgs.slice(0, 2).join(' ')}`;
            },
          },
          '@opentelemetry/instrumentation-mongodb': {
            enabled: true,
            enhancedDatabaseReporting: true,
          },
          '@opentelemetry/instrumentation-neo4j': {
            enabled: true,
          },
        }),
      ],
    });

    // Start the SDK
    this.sdk.start();

    // Get tracer instance
    this.tracer = trace.getTracer(
      this.config.serviceName,
      this.config.serviceVersion,
    );

    console.log(
      `OpenTelemetry tracing initialized for ${this.config.serviceName}`,
    );
  }

  /**
   * Create span processors for different exporters
   */
  private createSpanProcessors(): any[] {
    const processors = [];

    // Jaeger exporter
    if (this.config.exporters.jaeger?.enabled) {
      const jaegerExporter = new JaegerExporter({
        endpoint:
          this.config.exporters.jaeger.endpoint ||
          'http://localhost:14268/api/traces',
        headers: this.config.exporters.jaeger.headers || {},
      });
      processors.push(new BatchSpanProcessor(jaegerExporter));
    }

    // Zipkin exporter
    if (this.config.exporters.zipkin?.enabled) {
      const zipkinExporter = new ZipkinExporter({
        url:
          this.config.exporters.zipkin.endpoint ||
          'http://localhost:9411/api/v2/spans',
        headers: this.config.exporters.zipkin.headers || {},
      });
      processors.push(new BatchSpanProcessor(zipkinExporter));
    }

    // OTLP exporter
    if (this.config.exporters.otlp?.enabled) {
      const otlpExporter = new OTLPTraceExporter({
        url:
          this.config.exporters.otlp.endpoint ||
          'http://localhost:4318/v1/traces',
        headers: this.config.exporters.otlp.headers || {},
      });
      processors.push(new BatchSpanProcessor(otlpExporter));
    }

    return processors;
  }

  /**
   * Create a new span with enhanced context
   */
  createSpan(
    name: string,
    kind: SpanKind = SpanKind.INTERNAL,
    attributes: Record<string, any> = {},
    parentContext?: any,
  ): Span {
    const activeContext = parentContext || context.active();

    const span = this.tracer.startSpan(
      name,
      {
        kind,
        attributes: {
          'service.name': this.config.serviceName,
          'service.version': this.config.serviceVersion,
          environment: this.config.environment,
          ...attributes,
        },
      },
      activeContext,
    );

    // Record span start for metrics
    this.recordSpanStart(span, name);

    return span;
  }

  /**
   * Create a span for HTTP requests
   */
  createHttpSpan(
    method: string,
    url: string,
    attributes: Record<string, any> = {},
  ): Span {
    return this.createSpan(`HTTP ${method}`, SpanKind.CLIENT, {
      'http.method': method,
      'http.url': url,
      'http.scheme': new URL(url).protocol.replace(':', ''),
      'http.host': new URL(url).host,
      'http.target': new URL(url).pathname,
      ...attributes,
    });
  }

  /**
   * Create a span for database operations
   */
  createDatabaseSpan(
    operation: string,
    database: string,
    table?: string,
    attributes: Record<string, any> = {},
  ): Span {
    return this.createSpan(`${database} ${operation}`, SpanKind.CLIENT, {
      'db.system': database,
      'db.operation': operation,
      'db.name': database,
      'db.sql.table': table,
      ...attributes,
    });
  }

  /**
   * Create a span for message queue operations
   */
  createMessagingSpan(
    operation: 'send' | 'receive' | 'process',
    destination: string,
    system: string = 'kafka',
    attributes: Record<string, any> = {},
  ): Span {
    const kind = operation === 'send' ? SpanKind.PRODUCER : SpanKind.CONSUMER;

    return this.createSpan(`${destination} ${operation}`, kind, {
      'messaging.system': system,
      'messaging.destination': destination,
      'messaging.operation': operation,
      ...attributes,
    });
  }

  /**
   * Wrap an async function with tracing
   */
  async traceAsync<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    kind: SpanKind = SpanKind.INTERNAL,
    attributes: Record<string, any> = {},
  ): Promise<T> {
    const span = this.createSpan(name, kind, attributes);

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        async () => {
          return await fn(span);
        },
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });

      span.addEvent('exception', {
        'exception.type': error.constructor.name,
        'exception.message': error.message,
        'exception.stacktrace': error.stack,
      });

      throw error;
    } finally {
      this.recordSpanEnd(span);
      span.end();
    }
  }

  /**
   * Wrap a synchronous function with tracing
   */
  traceSync<T>(
    name: string,
    fn: (span: Span) => T,
    kind: SpanKind = SpanKind.INTERNAL,
    attributes: Record<string, any> = {},
  ): T {
    const span = this.createSpan(name, kind, attributes);

    try {
      const result = context.with(trace.setSpan(context.active(), span), () => {
        return fn(span);
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });

      span.addEvent('exception', {
        'exception.type': error.constructor.name,
        'exception.message': error.message,
        'exception.stacktrace': error.stack,
      });

      throw error;
    } finally {
      this.recordSpanEnd(span);
      span.end();
    }
  }

  /**
   * Add baggage to current context
   */
  setBaggage(key: string, value: string): void {
    // OpenTelemetry baggage implementation
    const baggage = trace.getBaggage(context.active()) || trace.createBaggage();
    const newBaggage = baggage.setEntry(key, { value });
    context.with(trace.setBaggage(context.active(), newBaggage), () => {});
  }

  /**
   * Get baggage from current context
   */
  getBaggage(key: string): string | undefined {
    const baggage = trace.getBaggage(context.active());
    return baggage?.getEntry(key)?.value;
  }

  /**
   * Get current trace ID
   */
  getCurrentTraceId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().traceId;
  }

  /**
   * Get current span ID
   */
  getCurrentSpanId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().spanId;
  }

  /**
   * Add custom tags to current span
   */
  addTags(tags: Record<string, any>): void {
    const span = trace.getActiveSpan();
    if (span) {
      Object.entries(tags).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    }
  }

  /**
   * Log event in current span
   */
  logEvent(name: string, attributes: Record<string, any> = {}): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, {
        timestamp: Date.now(),
        ...attributes,
      });
    }
  }

  /**
   * Get service topology and dependencies
   */
  async getServiceTopology(): Promise<ServiceTopology> {
    return (
      this.serviceTopology || {
        services: [],
        dependencies: [],
        metrics: {
          totalServices: 0,
          totalDependencies: 0,
          healthyServices: 0,
          criticalPaths: [],
          bottlenecks: [],
        },
      }
    );
  }

  /**
   * Analyze trace performance and detect bottlenecks
   */
  async analyzePerformance(traceId: string): Promise<any> {
    return this.performanceProfiler.analyzeTrace(traceId);
  }

  /**
   * Get performance metrics for a service
   */
  getServiceMetrics(serviceName?: string): any {
    const targetService = serviceName || this.config.serviceName;
    const relevantSpans = Array.from(this.spanMetrics.values()).filter(
      (span) => span.serviceName === targetService,
    );

    if (relevantSpans.length === 0) {
      return null;
    }

    const durations = relevantSpans.map((span) => span.duration);
    const errorCount = relevantSpans.filter(
      (span) => span.status === 'error',
    ).length;

    return {
      serviceName: targetService,
      totalSpans: relevantSpans.length,
      errorRate: errorCount / relevantSpans.length,
      avgLatency: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95Latency: this.calculatePercentile(durations, 95),
      p99Latency: this.calculatePercentile(durations, 99),
      minLatency: Math.min(...durations),
      maxLatency: Math.max(...durations),
    };
  }

  /**
   * Enhanced HTTP span with custom attributes
   */
  private enhanceHttpSpan(span: Span, request: any): void {
    span.setAttributes({
      'http.request_content_length': request.headers['content-length'] || 0,
      'http.user_agent': request.headers['user-agent'] || '',
      'http.x_forwarded_for': request.headers['x-forwarded-for'] || '',
      'custom.correlation_id': request.headers['x-correlation-id'] || '',
      'custom.request_id': uuidv4(),
    });
  }

  /**
   * Enhanced HTTP response span
   */
  private enhanceHttpResponse(span: Span, response: any): void {
    span.setAttributes({
      'http.response_content_length': response.headers['content-length'] || 0,
      'http.response_content_type': response.headers['content-type'] || '',
    });

    // Set span status based on HTTP status code
    if (response.statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${response.statusCode}`,
      });
    }
  }

  /**
   * Enhanced Express span
   */
  private enhanceExpressSpan(span: Span, info: any): void {
    span.setAttributes({
      'express.route': info.route || '',
      'express.request.body_size': JSON.stringify(info.request.body || {})
        .length,
      'express.request.query_params': JSON.stringify(info.request.query || {}),
    });
  }

  /**
   * Record span start for metrics collection
   */
  private recordSpanStart(span: Span, operationName: string): void {
    const spanContext = span.spanContext();
    const spanMetric: SpanMetrics = {
      spanId: spanContext.spanId,
      traceId: spanContext.traceId,
      operationName,
      serviceName: this.config.serviceName,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      status: 'ok',
      tags: {},
      logs: [],
    };

    this.spanMetrics.set(spanContext.spanId, spanMetric);
  }

  /**
   * Record span end and calculate metrics
   */
  private recordSpanEnd(span: Span): void {
    const spanContext = span.spanContext();
    const spanMetric = this.spanMetrics.get(spanContext.spanId);

    if (spanMetric) {
      spanMetric.endTime = Date.now();
      spanMetric.duration = spanMetric.endTime - spanMetric.startTime;

      // Check for slow spans
      if (spanMetric.duration > this.config.performance.slowSpanThreshold) {
        this.emit('slow_span', spanMetric);
      }

      this.emit('span_completed', spanMetric);
    }
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Set up metrics collection and analysis
   */
  private setupMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics();
    }, 60000);

    // Clean up old span metrics every 5 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000);
  }

  /**
   * Collect and emit metrics
   */
  private collectMetrics(): void {
    const metrics = this.getServiceMetrics();
    if (metrics) {
      this.emit('metrics_collected', metrics);
    }
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - 300000; // 5 minutes ago

    for (const [spanId, spanMetric] of this.spanMetrics.entries()) {
      if (spanMetric.endTime > 0 && spanMetric.endTime < cutoff) {
        this.spanMetrics.delete(spanId);
      }
    }
  }

  /**
   * Shutdown tracing gracefully
   */
  async shutdown(): Promise<void> {
    await this.sdk.shutdown();
  }
}

/**
 * Performance Profiler for trace analysis
 */
class PerformanceProfiler {
  private config: TraceConfig['performance'];

  constructor(config: TraceConfig['performance']) {
    this.config = config;
  }

  async analyzeTrace(traceId: string): Promise<any> {
    // Implementation would analyze trace spans and identify performance issues
    return {
      traceId,
      totalDuration: 0,
      criticalPath: [],
      bottlenecks: [],
      recommendations: [],
    };
  }
}

// Factory function to create tracing manager
export function createTracingManager(config: TraceConfig): TracingManager {
  return new TracingManager(config);
}

// Decorators for automatic tracing
export function Trace(operationName?: string): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const spanName =
      operationName || `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (...args: any[]) {
      const tracingManager = (this as any).tracingManager as TracingManager;

      if (!tracingManager) {
        return originalMethod.apply(this, args);
      }

      return tracingManager.traceAsync(spanName, async (span) => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

export default TracingManager;
