// @ts-nocheck
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import pino from 'pino';
import { getTracer, initializeTracing } from '../../observability/tracer.js';

const logger = (pino as any)({ name: 'observability-otel' });

interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  enableConsoleExporter: boolean;
  sampleRate: number;
}

class OpenTelemetryService {
  private static instance: OpenTelemetryService;
  private config: TracingConfig;

  private constructor(config: Partial<TracingConfig> = {}) {
    this.config = {
      serviceName: config.serviceName || process.env.OTEL_SERVICE_NAME || 'intelgraph-api',
      serviceVersion: config.serviceVersion || process.env.OTEL_SERVICE_VERSION || '1.0.0',
      environment: config.environment || process.env.NODE_ENV || 'development',
      jaegerEndpoint: config.jaegerEndpoint || process.env.JAEGER_ENDPOINT,
      enableConsoleExporter: config.enableConsoleExporter ?? process.env.NODE_ENV === 'development',
      sampleRate: config.sampleRate ?? parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
    };
  }

  public static getInstance(config?: Partial<TracingConfig>): OpenTelemetryService {
    if (!OpenTelemetryService.instance) {
      OpenTelemetryService.instance = new OpenTelemetryService(config);
    }
    return OpenTelemetryService.instance;
  }

  public initialize(): void {
    try {
      const tracer = initializeTracing({
        serviceName: this.config.serviceName,
        serviceVersion: this.config.serviceVersion,
        environment: this.config.environment,
        jaegerEndpoint: this.config.jaegerEndpoint,
        sampleRate: this.config.sampleRate
      });
      tracer.initialize();
      logger.info(
        `OpenTelemetry initialized via core tracer. Service: ${this.config.serviceName}, Env: ${this.config.environment}`,
      );
    } catch (error: any) {
      logger.error(
        `Failed to initialize OpenTelemetry: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  public async shutdown(): Promise<void> {
    const tracer = getTracer();
    await tracer.shutdown();
    logger.info('OpenTelemetry SDK shutdown');
  }

  public startSpan(
    name: string,
    attributes: Record<string, string | number | boolean> = {},
    kind: (typeof SpanKind)[keyof typeof SpanKind] = SpanKind.INTERNAL,
  ) {
    const tracer = getTracer();
    return tracer.startSpan(name, {
      kind,
      attributes: {
        'service.name': this.config.serviceName,
        'deployment.environment': this.config.environment,
        ...attributes,
      },
    });
  }

  public wrap<T>(
    name: string,
    fn: (span: ReturnType<typeof this.startSpan>) => Promise<T> | T,
    attributes: Record<string, string | number | boolean> = {},
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err: any) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err instanceof Error ? err.message : String(err),
        });
        span.recordException(
          err instanceof Error ? err : new Error(String(err)),
        );
        throw err;
      } finally {
        span.end();
      }
    });
  }

  private createNoOpSpan() {
    return {
      setStatus: () => {},
      setAttributes: () => {},
      addEvent: () => {},
      recordException: () => {},
      end: () => {},
      isRecording: () => false,
    };
  }

  public getTracer() {
    return trace.getTracer(this.config.serviceName, this.config.serviceVersion);
  }
}

export const otelService = OpenTelemetryService.getInstance();
