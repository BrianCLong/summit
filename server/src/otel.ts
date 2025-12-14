import { logger } from './config/logger.js';
import { NodeSDK } from '@opentelemetry/sdk-node';
import * as OpenTelemetryResources from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { cfg } from './config.js';

// Setup OpenTelemetry SDK
const resource = new OpenTelemetryResources.Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'intelgraph-server',
  [SemanticResourceAttributes.SERVICE_VERSION]:
    process.env.GIT_SHA || process.env.npm_package_version || 'dev',
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'intelgraph',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'local',
});

// Configure Exporter
// If OTLP_ENDPOINT is set, use OTLP. Else if JAEGER_ENDPOINT, use Jaeger. Else no-op/log.
let traceExporter: any = undefined;

if (process.env.OTLP_ENDPOINT) {
    traceExporter = new OTLPTraceExporter({
        url: process.env.OTLP_ENDPOINT,
    });
} else if (process.env.JAEGER_ENDPOINT) {
    traceExporter = new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT,
    });
}

// SDK Instance
export const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
    }),
  ],
});

let started = false;

export async function startOtel(): Promise<void> {
  if (started) return;

  // If explicitly disabled via env var
  if (process.env.ENABLE_OTEL === 'false') {
      logger.info('Observability (OTel) explicitly disabled via env.');
      return;
  }

  started = true;

  try {
    logger.info('Starting OpenTelemetry SDK...');
    await sdk.start();
    logger.info('OpenTelemetry SDK started successfully.');

    // Graceful shutdown handling
    const shutdown = async () => {
      try {
        await sdk.shutdown();
        logger.info('OpenTelemetry SDK shut down.');
      } catch (err) {
          logger.error({ err }, 'Error shutting down OpenTelemetry SDK');
      }
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.warn('Failed to start OpenTelemetry SDK', {
      error: (error as Error).message,
    });
  }
}

export function isOtelStarted() {
  return started;
}
