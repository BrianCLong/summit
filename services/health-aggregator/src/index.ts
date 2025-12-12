/**
 * Cross-System Health Aggregator Service
 * @module @intelgraph/health-aggregator
 */

export * from './health-aggregator.js';

import Redis from 'ioredis';
import pino from 'pino';
import Fastify from 'fastify';
import { HealthAggregator } from './health-aggregator.js';

const logger = pino({ name: 'health-aggregator' });

export async function createHealthAggregator(options?: {
  redisUrl?: string;
}): Promise<HealthAggregator> {
  const redis = new Redis(options?.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  const aggregator = new HealthAggregator({ redis, logger });
  return aggregator;
}

export async function createHealthServer(aggregator: HealthAggregator, port = 3400) {
  const app = Fastify({ logger: true });

  // Overall health
  app.get('/health', async () => aggregator.getAggregatedStatus());
  app.get('/healthz', async () => {
    const status = aggregator.getAggregatedStatus();
    return { ok: status.overallStatus !== 'unhealthy' };
  });
  app.get('/livez', async () => ({ ok: true }));
  app.get('/readyz', async () => {
    const status = aggregator.getAggregatedStatus();
    return { ok: status.healthyComponents > 0 };
  });

  // System status
  app.get('/health/system/:system', async (request) => {
    const { system } = request.params as { system: string };
    return aggregator.getSystemStatus(system as any);
  });

  // Component status
  app.get('/health/component/:id', async (request) => {
    const { id } = request.params as { id: string };
    return aggregator.getComponentStatus(id);
  });

  // All components
  app.get('/health/components', async () => aggregator.getAllComponentStatuses());

  // Force check
  app.post('/health/check', async () => aggregator.checkAll());

  // History
  app.get('/health/history/:id', async (request) => {
    const { id } = request.params as { id: string };
    const { hours } = request.query as { hours?: string };
    return aggregator.getUptimeHistory(id, hours ? parseInt(hours) : 24);
  });

  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'Health Aggregator Server started');

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3400);
  (async () => {
    const aggregator = await createHealthAggregator();
    await createHealthServer(aggregator, port);
  })().catch((error) => {
    logger.error({ error }, 'Failed to start');
    process.exit(1);
  });
}
