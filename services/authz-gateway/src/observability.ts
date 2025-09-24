import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Registry, collectDefaultMetrics, Histogram } from 'prom-client';
import type { Request, Response } from 'express';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

let started = false;

export async function startObservability() {
  if (started) return;
  await sdk.start();
  started = true;
}

export async function stopObservability() {
  if (!started) return;
  await sdk.shutdown();
  started = false;
}

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

const LATENCY_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5];

export const requestLatency = new Histogram({
  name: 'authz_http_request_duration_seconds',
  help: 'AuthZ gateway HTTP request latency',
  buckets: LATENCY_BUCKETS_SECONDS,
  labelNames: ['route', 'method', 'status']
});

registry.registerMetric(requestLatency);

export async function metricsHandler(_req: Request, res: Response) {
  res.setHeader('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}
