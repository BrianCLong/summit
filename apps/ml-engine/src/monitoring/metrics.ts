import express from 'express';
import client, { Counter, Histogram, Registry } from 'prom-client';

import { config } from '../config';
import { logger } from '../utils/logger';
import { setupGpuMetrics } from './gpuMetrics';

const metricsRegistry = new Registry();

const requestCounter = new Counter({
  name: 'ml_engine_http_requests_total',
  help: 'Total number of HTTP requests processed by the ML Engine API',
  labelNames: ['route', 'status'],
  registers: [metricsRegistry],
});

const requestDuration = new Histogram({
  name: 'ml_engine_http_request_duration_seconds',
  help: 'Duration of ML Engine HTTP requests in seconds',
  labelNames: ['route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

let metricsServerStarted = false;

export async function startMetricsServer(): Promise<void> {
  if (!config.monitoring.metricsEnabled) {
    logger.info('Prometheus metrics disabled for ml-engine');
    return;
  }

  if (metricsServerStarted) {
    return;
  }

  metricsServerStarted = true;

  client.collectDefaultMetrics({ register: metricsRegistry, prefix: 'ml_engine_' });
  await setupGpuMetrics(metricsRegistry);

  const metricsApp = express();
  metricsApp.get(config.monitoring.metricsPath, async (_req, res) => {
    res.setHeader('Content-Type', metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
  });

  metricsApp.listen(config.monitoring.metricsPort, () => {
    logger.info('Metrics server listening on %s', config.monitoring.metricsPort);
  });
}

export function observeHttpRequest(route: string, statusCode: number, durationSeconds: number): void {
  const status = statusCode.toString();
  requestCounter.inc({ route, status });
  requestDuration.observe({ route, status }, durationSeconds);
}

export { metricsRegistry };
