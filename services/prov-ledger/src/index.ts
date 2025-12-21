import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import pclRoutes from './routes/pcl.js';
import { Registry, collectDefaultMetrics, Histogram, Counter } from 'prom-client';

export function buildServer(): FastifyInstance {
  const server: FastifyInstance = Fastify({
    logger: { level: process.env.LOG_LEVEL || 'info' },
  });

  const register = new Registry();
  collectDefaultMetrics({ register });
  const httpRequests = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [register],
  });
  const httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register],
  });

  server.register(helmet);
  server.register(cors, { origin: process.env.CORS_ORIGIN || '*' });

  server.addHook('onRequest', async (req) => {
    (req as any).metricsStart = process.hrtime.bigint();
  });

  server.addHook('onResponse', async (req, reply) => {
    const route = req.routerPath || req.url || 'unknown';
    httpRequests.inc({ method: req.method, route, status: reply.statusCode.toString() });
    const start = (req as any).metricsStart as bigint | undefined;
    if (start) {
      const durationNs = Number(process.hrtime.bigint() - start);
      httpDuration.observe({ method: req.method, route }, durationNs / 1e9);
    }
  });

  server.get('/healthz', async () => ({ status: 'ok', service: 'prov-ledger' }));
  server.get('/readyz', async () => ({ ready: true }));
  server.get('/metrics', async (_, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  server.register(pclRoutes);
  return server;
}

if (process.env.NODE_ENV !== 'test') {
  const server = buildServer();
  const PORT = parseInt(process.env.PORT || '4010', 10);
  server.listen({ port: PORT, host: '0.0.0.0' }).catch((err) => {
    server.log.error(err);
    process.exit(1);
  });
}
