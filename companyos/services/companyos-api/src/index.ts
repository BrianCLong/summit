import express from 'express';
import pino from 'pino';
import promClient from 'prom-client';
import { healthRoute } from './routes/health';

const logger = pino();
const app = express();
const port = Number(process.env.PORT ?? 4100);

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
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
      path: req.path,
      status_code: res.statusCode,
      duration_sec: durationSec,
    });
  });

  next();
});

app.get('/health', healthRoute);

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.listen(port, () => {
  logger.info({ port }, 'companyos-api listening');
});
