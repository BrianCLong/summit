import express from 'express';
import config from 'config';
import promClient from 'prom-client';
import pino from 'pino';

import healthRouter from './routes/health.js';

const app = express();
const serviceName = config.get<string>('service.name');
const port = Number(process.env.PORT ?? config.get<number>('service.port'));
const logger = pino({ name: serviceName });

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(httpDuration);

app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationSec = Number(end - start) / 1e9;

    httpDuration
      .labels(req.method, req.route?.path ?? req.path, String(res.statusCode))
      .observe(durationSec);

    logger.info({
      event_type: 'http_request',
      method: req.method,
      path: req.originalUrl,
      status_code: res.statusCode,
      duration_sec: durationSec,
      tenant_id: (req as any).tenant_id ?? null,
      trace_id: (req as any).trace_id ?? null
    });
  });

  (req as any).log = logger;
  next();
});

app.use(express.json());
app.use('/', healthRouter);

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    logger.info({ port, service: serviceName }, 'api-svc-template listening');
  });
}

export default app;
