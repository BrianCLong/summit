import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpReqLatency = new client.Histogram({
  name: 'symphony_http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['route', 'method', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});
register.registerMetric(httpReqLatency);

export const routeExecuteLatency = new client.Histogram({
  name: 'symphony_route_execute_latency_seconds',
  help: 'Latency for /route/execute',
  labelNames: ['model', 'stream', 'status']
});
register.registerMetric(routeExecuteLatency);

export const budgetFraction = new client.Gauge({
  name: 'symphony_model_budget_fraction_used',
  help: 'Fraction of daily budget used',
  labelNames: ['model']
});
register.registerMetric(budgetFraction);

export function metricsHandler(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
}

export function timed(routeLabel: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const end = httpReqLatency.startTimer({ route: routeLabel, method: req.method });
    res.on('finish', () => end({ status: String(res.statusCode) }));
    next();
  };
}
