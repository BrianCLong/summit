import promClient from 'prom-client';
import type { RequestHandler } from 'express';

promClient.collectDefaultMetrics();

export const httpReqDur = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'latency',
  buckets: [50, 100, 250, 500, 1000],
  labelNames: ['service', 'route', 'method'],
});

export const metricsMiddleware = (serviceName: string): RequestHandler => (req, res, next) => {
  const end = httpReqDur.startTimer({ service: serviceName, route: req.path, method: req.method });
  res.on('finish', () => end());
  next();
};
