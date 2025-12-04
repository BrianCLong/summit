/**
 * OpenTelemetry Instrumentation for GraphQL Gateway
 * Provides comprehensive tracing and metrics for Apollo Federation
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import {
  PeriodicExportingMetricReader,
  MeterProvider,
} from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import {
  SemanticResourceAttributes,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const environment = process.env.NODE_ENV || 'development';
const serviceName = 'graphql-gateway';
const serviceVersion = process.env.SERVICE_VERSION || '0.1.0';

// OTLP collector endpoint (from docker-compose.observability.yml)
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';

// Resource attributes
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: serviceName,
  [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
});

// Prometheus exporter for metrics (scraping endpoint)
const prometheusExporter = new PrometheusExporter(
  {
    port: 9464, // Metrics endpoint on /metrics
  },
  () => {
    console.log(
      `Prometheus metrics available at http://localhost:9464/metrics`
    );
  }
);

// OTLP exporters
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
});

const metricExporter = new OTLPMetricExporter({
  url: `${otlpEndpoint}/v1/metrics`,
});

// Metric reader for periodic export
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 10000, // Export every 10s
});

// Initialize OpenTelemetry SDK
export const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (req) => {
          // Don't trace health checks
          return req.url?.startsWith('/health') ?? false;
        },
      },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-graphql': {
        enabled: true,
        mergeItems: true,
        allowValues: false, // Don't log variable values (PII risk)
      },
    }),
  ],
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  try {
    await sdk.shutdown();
    console.log('OpenTelemetry SDK shut down successfully');
  } catch (error) {
    console.error('Error shutting down OpenTelemetry SDK', error);
  }
});

// Start SDK
sdk.start();
console.log(`OpenTelemetry initialized for ${serviceName} (${environment})`);

// Setup Prometheus metrics exporter separately for scraping
const meterProvider = new MeterProvider({
  resource,
  readers: [prometheusExporter],
});

export const meter = meterProvider.getMeter(serviceName, serviceVersion);
