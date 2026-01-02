// @ts-nocheck
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import pino from 'pino';

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
  private sdk: NodeSDK | null = null;
  private tracer: ReturnType<typeof trace.getTracer> | null = null;
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
    if (this.sdk) {
      logger.warn('OpenTelemetry SDK already initialized');
      return;
    }

    try {
      const resource = Resource.default().merge(
        new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
        }),
      );

      const traceExporters: JaegerExporter[] = [];
      if (this.config.jaegerEndpoint) {
        traceExporters.push(
          new JaegerExporter({ endpoint: this.config.jaegerEndpoint }),
        );
      }

      const metricReaders: PrometheusExporter[] = [];
      // Use port 9464 as standard
      metricReaders.push(
        new PrometheusExporter({
          port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
        }),
      );

      this.sdk = new NodeSDK({
        resource,
        traceExporter: traceExporters.length > 0 ? traceExporters[0] : undefined,
        metricReader: metricReaders.length > 0 ? metricReaders[0] : undefined,
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': { enabled: false },
          }),
        ],
      });

      this.sdk.start();
      this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);

      logger.info(
        `OpenTelemetry initialized. Service: ${this.config.serviceName}, Env: ${this.config.environment}`,
      );
    } catch (error: any) {
      logger.error(
        `Failed to initialize OpenTelemetry: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  public async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.sdk = null;
      logger.info('OpenTelemetry SDK shutdown');
    }
  }

  public startSpan(
    name: string,
    attributes: Record<string, string | number | boolean> = {},
    kind: (typeof SpanKind)[keyof typeof SpanKind] = SpanKind.INTERNAL,
  ) {
    if (!this.tracer) return this.createNoOpSpan();
    return this.tracer.startSpan(name, {
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
    return this.tracer;
  }
}

export const otelService = OpenTelemetryService.getInstance();
