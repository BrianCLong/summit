/**
 * CompanyOS-driven Feature Flags and Access Policies
 * @module @intelgraph/feature-flags
 */

export * from './feature-flag-service.js';

import { Pool } from 'pg';
import Redis from 'ioredis';
import pino from 'pino';
import Fastify from 'fastify';
import { FeatureFlagService, EvaluationContext } from './feature-flag-service.js';

const logger = pino({ name: 'feature-flags' });

export async function createFeatureFlagService(options?: {
  postgresUrl?: string;
  redisUrl?: string;
  opaUrl?: string;
}): Promise<FeatureFlagService> {
  const postgres = new Pool({
    connectionString: options?.postgresUrl || process.env.DATABASE_URL,
  });

  const redis = new Redis(options?.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');

  const service = new FeatureFlagService({
    postgres,
    redis,
    logger,
    opaUrl: options?.opaUrl,
  });

  await service.initialize();
  return service;
}

export async function createFeatureFlagServer(service: FeatureFlagService, port = 3300) {
  const app = Fastify({ logger: true });

  app.get('/healthz', async () => ({ ok: true }));

  // Evaluate flag
  app.post('/evaluate/:key', async (request) => {
    const { key } = request.params as { key: string };
    const context = request.body as EvaluationContext;
    return service.evaluate(key, context);
  });

  // Evaluate all flags
  app.post('/evaluate-all', async (request) => {
    const context = request.body as EvaluationContext;
    return service.evaluateAll(context);
  });

  // CRUD operations
  app.post('/flags', async (request) => service.createFlag(request.body as any));
  app.get('/flags/:tenantId', async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    return service.listFlags(tenantId, request.query as any);
  });
  app.get('/flags/:tenantId/:key', async (request) => {
    const { tenantId, key } = request.params as { tenantId: string; key: string };
    return service.getFlag(key, tenantId);
  });
  app.put('/flags/:tenantId/:key', async (request) => {
    const { tenantId, key } = request.params as { tenantId: string; key: string };
    return service.updateFlag(key, tenantId, request.body as any);
  });
  app.delete('/flags/:tenantId/:key', async (request) => {
    const { tenantId, key } = request.params as { tenantId: string; key: string };
    return service.deleteFlag(key, tenantId);
  });

  // Stats
  app.get('/stats/:tenantId', async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    const { flagKey, hours } = request.query as { flagKey?: string; hours?: string };
    return service.getStats(tenantId, flagKey, hours ? parseInt(hours) : 24);
  });

  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'Feature Flag Server started');

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3300);
  (async () => {
    const service = await createFeatureFlagService();
    await createFeatureFlagServer(service, port);
  })().catch((error) => {
    logger.error({ error }, 'Failed to start');
    process.exit(1);
  });
}
