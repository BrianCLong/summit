/**
 * OpenTelemetry Initialization
 * Sets up distributed tracing and metrics collection
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

/**
 * Initialize OpenTelemetry SDK
 * Must be called before any other imports to ensure proper instrumentation
 */
export function initializeOpenTelemetry() {
  // Enable diagnostic logging for development
  if (process.env.NODE_ENV === 'development') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  const resource = Resource.default().merge(
    new Resource({
      [ATTR_SERVICE_NAME]: 'intelgraph-server',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      'deployment.environment': process.env.NODE_ENV || 'development',
    }),
  );

  // Prometheus metrics exporter
  const prometheusExporter = new PrometheusExporter({
    port: Number(process.env.PROMETHEUS_PORT) || 9464,
    endpoint: '/metrics',
  });

  // Jaeger trace exporter (if configured)
  const traceExporter = process.env.JAEGER_ENDPOINT
    ? new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT,
        tags: [],
      })
    : undefined;

  const sdk = new NodeSDK({
    resource: resource,
    traceExporter: traceExporter,
    metricReader: prometheusExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Automatically instrument HTTP, Express, PostgreSQL, Redis, etc.
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable file system instrumentation for performance
        },
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) => {
            // Don't trace health checks and metrics endpoints
            const url = req.url || '';
            return (
              url.includes('/health') ||
              url.includes('/metrics') ||
              url.includes('/favicon.ico')
            );
          },
        },
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-pg': {
          enabled: true,
          enhancedDatabaseReporting: true,
        },
        '@opentelemetry/instrumentation-redis-4': {
          enabled: true,
        },
      }),
    ],
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('OpenTelemetry terminated'))
      .catch((error) => console.error('Error terminating OpenTelemetry', error));
  });

  return sdk;
}

/**
 * Start OpenTelemetry SDK
 */
export function startOpenTelemetry() {
  const sdk = initializeOpenTelemetry();

  sdk
    .start()
    .then(() => {
      console.log('✅ OpenTelemetry initialized successfully');
      console.log(`📊 Prometheus metrics available at http://localhost:${process.env.PROMETHEUS_PORT || 9464}/metrics`);
      if (process.env.JAEGER_ENDPOINT) {
        console.log(`🔍 Jaeger tracing enabled: ${process.env.JAEGER_ENDPOINT}`);
      }
    })
    .catch((error) => {
      console.error('❌ Error initializing OpenTelemetry:', error);
    });

  return sdk;
}
