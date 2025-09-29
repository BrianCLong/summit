import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

let started = false;

export async function startOtel() {
  if (started) return;
  started = true;
  const jaegerEndpoint = process.env.JAEGER_ENDPOINT || process.env.OTEL_EXPORTER_JAEGER_ENDPOINT;
  const exporter = jaegerEndpoint ? new JaegerExporter({ endpoint: jaegerEndpoint }) : undefined as any;

  const sdk = new NodeSDK({
    traceExporter: exporter,
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'intelgraph-server',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'dev',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  await sdk.start();
  process.on('SIGTERM', () => sdk.shutdown());
}

export function isOtelStarted() { return started; }
