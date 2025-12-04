import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.js';
import { register, httpRequestDurationMicroseconds } from './metrics.js';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(pinoHttp({ logger }));

// Metrics middleware
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, code: res.statusCode });
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: process.env.npm_package_version || '0.0.0' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Golden Service!' });
});
