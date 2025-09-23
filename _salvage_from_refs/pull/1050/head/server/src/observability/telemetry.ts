import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import pino from 'pino';

const logger = pino({ name: 'telemetry' });

// Initialize OpenTelemetry with minimal, non-intrusive configuration
// This is a "starter rail" - vendor-neutral and easily extensible
export function initializeTelemetry() {
  const isProduction = process.env.NODE_ENV === 'production';
  const serviceName = process.env.OTEL_SERVICE_NAME || 'intelgraph-server';
  const serviceVersion = process.env.OTEL_SERVICE_VERSION || process.env.npm_package_version || '1.0.0';
  
  // Only enable telemetry if explicitly configured or in production
  const telemetryEnabled = process.env.OTEL_ENABLED === 'true' || isProduction;
  
  if (!telemetryEnabled) {
    logger.info('OpenTelemetry disabled in development mode. Set OTEL_ENABLED=true to enable.');
    return;
  }

  try {
    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'intelgraph',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      }),
      
      // Trace configuration - non-intrusive defaults
      traceExporter: process.env.OTEL_EXPORTER_OTLP_ENDPOINT 
        ? undefined // Use default OTLP exporter if endpoint is configured
        : new ConsoleSpanExporter(), // Fallback to console in dev
      
      // Metric configuration - export to console by default
      metricReader: new PeriodicExportingMetricReader({
        exporter: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
          ? undefined // Use default OTLP exporter if endpoint is configured  
          : new ConsoleMetricExporter(), // Fallback to console
        exportIntervalMillis: 30000, // Export every 30 seconds
      }),
      
      // Auto-instrumentations - carefully selected for minimal overhead
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable noisy instrumentations by default
          '@opentelemetry/instrumentation-winston': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-bunyan': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-pino': {
            enabled: false, // We handle our own logging
          },
          // Enable core instrumentations
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            requestHook: (span, request) => {
              // Add custom attributes for GraphQL requests
              if (request.url?.includes('/graphql')) {
                span.setAttributes({
                  'intelgraph.request.type': 'graphql',
                });
              }
            },
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-graphql': {
            enabled: true,
            allowValues: false, // Don't capture sensitive data
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-pg': {
            enabled: true,
          },
        }),
      ],
    });

    // Initialize the SDK
    sdk.start();
    
    logger.info({
      serviceName,
      serviceVersion,
      otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'console',
    }, 'OpenTelemetry initialized successfully');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      try {
        await sdk.shutdown();
        logger.info('OpenTelemetry shut down successfully');
      } catch (error) {
        logger.error(error, 'Error shutting down OpenTelemetry');
      }
    });

    return sdk;
  } catch (error) {
    logger.error(error, 'Failed to initialize OpenTelemetry');
    // Don't crash the application if telemetry fails
    return null;
  }
}

// Export metrics helpers for custom metrics
export { metrics } from '@opentelemetry/api';
export { trace } from '@opentelemetry/api';