import { diag, DiagConsoleLogger, DiagLogLevel, context as otelContext } from '@opentelemetry/api';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';

let sdk: NodeSDK | undefined;

export const TRACING_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'feed-processor';

export function initializeTracing(): void {
  if (sdk) {
    return;
  }

  if (process.env.OTEL_SDK_DISABLED === 'true') {
    return;
  }

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

  const exporter = new JaegerExporter({
    endpoint:
      process.env.OTEL_EXPORTER_JAEGER_ENDPOINT ||
      process.env.JAEGER_COLLECTOR_ENDPOINT ||
      'http://jaeger-collector.observability.svc.cluster.local:14268/api/traces',
    username: process.env.OTEL_EXPORTER_JAEGER_USER,
    password: process.env.OTEL_EXPORTER_JAEGER_PASSWORD
  });

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: TRACING_SERVICE_NAME,
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'workflows',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'local'
    }),
    traceExporter: exporter,
    instrumentations: [
      new HttpInstrumentation(),
      new UndiciInstrumentation(),
      new PgInstrumentation(),
      new IORedisInstrumentation()
    ]
  });

  sdk
    .start()
    .then(() => {
      diag.debug('OpenTelemetry tracing initialized for feed-processor');
    })
    .catch(error => {
      console.error('Failed to initialize OpenTelemetry tracing', error);
    });

  const shutdown = async () => {
    if (!sdk) return;
    try {
      await sdk.shutdown();
    } catch (error) {
      console.error('Error shutting down OpenTelemetry SDK', error);
    }
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

// Ensure active context exists before other modules import tracing helpers
initializeTracing();
otelContext.active();
