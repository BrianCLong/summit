
// @ts-ignore
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
// @ts-ignore
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
// @ts-ignore
import { Resource } from '@opentelemetry/resources';
// @ts-ignore
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
// @ts-ignore
import { NodeSDK } from '@opentelemetry/sdk-node';

export const initTelemetry = (serviceName: string) => {
  const traceExporter = new OTLPTraceExporter({
    url: 'grpc://otel-collector:4317',
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => { /* do nothing */ })
      .catch(() => { /* do nothing */ })
      .finally(() => process.exit(0));
  });

  return sdk;
};
