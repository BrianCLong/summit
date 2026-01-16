// server/src/instrumentation.ts
// Minimal OpenTelemetry wiring for the Summit Platform

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

// Configure the SDK
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PrometheusExporter({
    port: 9464,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Auto-start for now to ensure default wiring behavior when imported
sdk.start();
console.log('🔭 OpenTelemetry initialized');

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down'))
    .catch((error) => console.log('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});
