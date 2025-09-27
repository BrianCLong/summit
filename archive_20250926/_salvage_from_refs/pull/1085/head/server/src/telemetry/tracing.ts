/**
 * OpenTelemetry Distributed Tracing Configuration for IntelGraph
 * Provides comprehensive instrumentation for Maestro Orchestration System
 */

import { NodeSDK } from '@opentelemetry/auto-instrumentations-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

/**
 * Custom IntelGraph Tracing Configuration
 */
export class IntelGraphTracing {
  private static instance: IntelGraphTracing;
  private provider: NodeTracerProvider;
  private tracer: any;

  private constructor() {
    this.setupTracing();
  }

  public static getInstance(): IntelGraphTracing {
    if (!IntelGraphTracing.instance) {
      IntelGraphTracing.instance = new IntelGraphTracing();
    }
    return IntelGraphTracing.instance;
  }

  private setupTracing(): void {
    // Resource configuration
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'maestro-orchestrator',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '2.0.0',
        [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'unknown',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
        'intelgraph.cluster': process.env.CLUSTER_NAME || 'local',
        'intelgraph.region': process.env.AWS_REGION || 'us-west-2',
      })
    );

    // Create tracer provider
    this.provider = new NodeTracerProvider({
      resource: resource,
    });

    // Configure exporters
    const exporters = this.configureExporters();
    exporters.forEach(exporter => {
      this.provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
        maxQueueSize: 2048,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 30000,
        maxExportBatchSize: 512,
      }));
    });

    // Register provider
    this.provider.register();

    // Setup instrumentations
    this.setupInstrumentations();

    // Get tracer
    this.tracer = trace.getTracer('intelgraph-maestro', '2.0.0');

    console.log('✅ IntelGraph distributed tracing initialized');
  }

  private configureExporters(): any[] {
    const exporters = [];

    // OTLP Exporter (primary - to OpenTelemetry Collector)
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';
    exporters.push(new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      headers: {
        'x-intelgraph-cluster': process.env.CLUSTER_NAME || 'local',
      },
    }));

    // Jaeger Exporter (backup/direct)
    if (process.env.JAEGER_ENDPOINT) {
      exporters.push(new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT,
        serviceName: 'maestro-orchestrator',
      }));
    }

    // Console exporter for development
    if (process.env.NODE_ENV === 'development') {
      exporters.push(new ConsoleSpanExporter());
    }

    return exporters;
  }

  private setupInstrumentations(): void {
    registerInstrumentations({
      instrumentations: [
        // Auto-instrumentations
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Too noisy
          },
        }),
        
        // Custom instrumentations with detailed config
        new HttpInstrumentation({
          requestHook: (span, request) => {
            span.setAttributes({
              'http.request.body.size': request.headers['content-length'] || 0,
              'intelgraph.request.id': request.headers['x-request-id'],
              'intelgraph.tenant.id': request.headers['x-tenant-id'],
            });
          },
          responseHook: (span, response) => {
            span.setAttributes({
              'http.response.body.size': response.headers['content-length'] || 0,
            });
          },
        }),
        
        new ExpressInstrumentation({
          requestHook: (span, info) => {
            span.setAttributes({
              'intelgraph.route': info.route,
              'intelgraph.user.id': info.req.headers['x-user-id'],
            });
          },
        }),
        
        new GraphQLInstrumentation({
          mergeItems: true,
          allowValues: true,
        }),
        
        new RedisInstrumentation({
          dbStatementSerializer: (cmdName, cmdArgs) => {
            // Sanitize Redis commands for tracing
            if (cmdArgs.length > 0) {
              return `${cmdName} ${cmdArgs[0]}`;
            }
            return cmdName;
          },
        }),
        
        new PgInstrumentation({
          enhancedDatabaseReporting: true,
        }),
      ],
    });
  }

  /**
   * Create a custom span for orchestration operations
   */
  public createOrchestrationSpan(
    operationName: string, 
    attributes: Record<string, string | number | boolean> = {}
  ): any {
    return this.tracer.startSpan(operationName, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'intelgraph.operation.type': 'orchestration',
        'intelgraph.component': 'maestro',
        ...attributes,
      },
    });
  }

  /**
   * Create a span for AI model interactions
   */
  public createAIModelSpan(
    modelName: string,
    operation: string,
    attributes: Record<string, string | number | boolean> = {}
  ): any {
    return this.tracer.startSpan(`ai.${modelName}.${operation}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'ai.model.name': modelName,
        'ai.operation': operation,
        'intelgraph.component': 'ai-router',
        ...attributes,
      },
    });
  }

  /**
   * Create a span for graph database operations
   */
  public createGraphSpan(
    operation: string,
    query?: string,
    attributes: Record<string, string | number | boolean> = {}
  ): any {
    return this.tracer.startSpan(`graph.${operation}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'neo4j',
        'db.operation': operation,
        'db.statement': query ? this.sanitizeQuery(query) : undefined,
        'intelgraph.component': 'graph-engine',
        ...attributes,
      },
    });
  }

  /**
   * Create a span for premium routing decisions
   */
  public createPremiumRoutingSpan(
    decision: string,
    attributes: Record<string, string | number | boolean> = {}
  ): any {
    return this.tracer.startSpan(`routing.premium.${decision}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'intelgraph.routing.decision': decision,
        'intelgraph.component': 'premium-router',
        ...attributes,
      },
    });
  }

  /**
   * Trace async operations with automatic error handling
   */
  public async traceAsync<T>(
    spanName: string,
    operation: () => Promise<T>,
    attributes: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    const span = this.tracer.startSpan(spanName, { attributes });
    
    try {
      const result = await operation();
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

  /**
   * Add custom attributes to current span
   */
  public addAttributesToCurrentSpan(attributes: Record<string, string | number | boolean>): void {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttributes(attributes);
    }
  }

  /**
   * Record a custom event in the current span
   */
  public recordEvent(name: string, attributes: Record<string, string | number | boolean> = {}): void {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.addEvent(name, attributes);
    }
  }

  /**
   * Get the current trace context
   */
  public getCurrentTraceContext(): any {
    return context.active();
  }

  /**
   * Sanitize database queries for tracing (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data patterns
    return query
      .replace(/password\s*[:=]\s*['"][^'"]*['"]?/gi, 'password: [REDACTED]')
      .replace(/token\s*[:=]\s*['"][^'"]*['"]?/gi, 'token: [REDACTED]')
      .replace(/key\s*[:=]\s*['"][^'"]*['"]?/gi, 'key: [REDACTED]')
      .substring(0, 1000); // Limit query length
  }

  /**
   * Shutdown tracing gracefully
   */
  public async shutdown(): Promise<void> {
    await this.provider.shutdown();
    console.log('🔄 IntelGraph tracing shutdown complete');
  }
}

/**
 * Custom tracing decorators for common operations
 */
export function Traced(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const tracing = IntelGraphTracing.getInstance();

    descriptor.value = async function (...args: any[]) {
      const spanName = operationName || `${target.constructor.name}.${propertyKey}`;
      
      return tracing.traceAsync(
        spanName,
        () => originalMethod.apply(this, args),
        {
          'code.function': propertyKey,
          'code.namespace': target.constructor.name,
        }
      );
    };

    return descriptor;
  };
}

/**
 * Express middleware for request tracing
 */
export function tracingMiddleware() {
  const tracing = IntelGraphTracing.getInstance();

  return (req: any, res: any, next: any) => {
    // Extract trace context from headers
    const traceId = req.headers['x-trace-id'];
    const spanId = req.headers['x-span-id'];

    // Add request attributes to span
    tracing.addAttributesToCurrentSpan({
      'http.method': req.method,
      'http.url': req.url,
      'http.route': req.route?.path,
      'intelgraph.request.id': req.headers['x-request-id'],
      'intelgraph.user.id': req.headers['x-user-id'],
      'intelgraph.tenant.id': req.headers['x-tenant-id'],
    });

    // Set response headers for trace propagation
    res.setHeader('x-trace-id', trace.getActiveSpan()?.spanContext().traceId || 'unknown');

    next();
  };
}

// Initialize tracing on module load
const tracing = IntelGraphTracing.getInstance();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await tracing.shutdown();
});

export default tracing;