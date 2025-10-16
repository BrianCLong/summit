import { NodeSDK } from ' @opentelemetry/sdk-node';
import { OTLPTraceExporter } from ' @opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from ' @opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from ' @opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from ' @opentelemetry/auto-instrumentations-node';
import { Resource } from ' @opentelemetry/resources';
import { SemanticResourceAttributes as S } from ' @opentelemetry/semantic-conventions';

const resource = new Resource({
  [S.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'api',
  [S.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'dev',
});

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    }),
    exportIntervalMillis: 15000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      ' @opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: () => false,
      },
      ' @opentelemetry/instrumentation-express': {},
    }),
  ],
});

export async function startOTEL() {
  await sdk.start();
}
export async function stopOTEL() {
  await sdk.shutdown();
}
