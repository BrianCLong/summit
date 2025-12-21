// Minimal OTEL setup for Node services (Express/Apollo-compatible)
const process = require('process');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || `${otlpEndpoint}/v1/traces`
});
const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || `${otlpEndpoint}/v1/metrics`
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || process.env.npm_package_name || 'unknown-service'
  }),
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({ exporter: metricExporter }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk
  .start()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('[otel] OpenTelemetry SDK started');
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[otel] failed to start OpenTelemetry SDK', err);
  });

async function shutdown() {
  try {
    await sdk.shutdown();
    // eslint-disable-next-line no-console
    console.log('[otel] OpenTelemetry SDK shut down');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[otel] error during OpenTelemetry shutdown', err);
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
