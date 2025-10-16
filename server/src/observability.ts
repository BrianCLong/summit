// src/observability.ts (Node)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export function startTelemetry() {
  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({ url: process.env.OTLP_URL }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();
}
