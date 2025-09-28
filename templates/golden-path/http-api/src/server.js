import express from 'express';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

app.use(helmet());
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: '{{SERVICE_NAME}}' });
});

app.get('/readyz', (_req, res) => {
  res.json({ status: 'ready' });
});

const port = process.env.PORT || 8080;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    logger.info({ port }, 'listening');
  });
}

export default app;
