/**
 * Unified Audit Log Service
 * @module @intelgraph/unified-audit
 */

export * from './types.js';
export * from './aggregator.js';

import { Pool } from 'pg';
import Redis from 'ioredis';
import pino from 'pino';
import Fastify from 'fastify';
import { UnifiedAuditAggregator } from './aggregator.js';
import { AuditQuerySchema, ComplianceFramework } from './types.js';

const logger = pino({ name: 'unified-audit' });

/**
 * Create and initialize a Unified Audit Aggregator instance
 */
export async function createAuditAggregator(options?: {
  postgresUrl?: string;
  redisUrl?: string;
  signingSecret?: string;
}): Promise<UnifiedAuditAggregator> {
  const postgres = new Pool({
    connectionString: options?.postgresUrl || process.env.DATABASE_URL,
  });

  const redis = new Redis(options?.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');

  const aggregator = new UnifiedAuditAggregator({
    postgres,
    redis,
    logger,
    signingSecret: options?.signingSecret || process.env.AUDIT_SIGNING_SECRET,
  });

  await aggregator.initialize();

  return aggregator;
}

/**
 * Create HTTP server for the audit service
 */
export async function createAuditServer(aggregator: UnifiedAuditAggregator, port = 3200) {
  const app = Fastify({ logger: true });

  // Health checks
  app.get('/healthz', async () => ({ ok: true }));
  app.get('/livez', async () => ({ ok: true }));

  // Ingest endpoint
  app.post('/ingest', async (request, reply) => {
    const eventId = await aggregator.ingest(request.body as any);
    return { eventId };
  });

  // Query endpoint
  app.post('/query', async (request) => {
    const params = AuditQuerySchema.parse(request.body);
    return aggregator.query(params);
  });

  // Aggregation endpoint
  app.get('/aggregation/:tenantId', async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    const { startTime, endTime } = request.query as { startTime?: string; endTime?: string };
    return aggregator.getAggregation(
      tenantId,
      startTime ? new Date(startTime) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      endTime ? new Date(endTime) : new Date()
    );
  });

  // Compliance report endpoint
  app.post('/compliance/:tenantId/:framework', async (request) => {
    const { tenantId, framework } = request.params as { tenantId: string; framework: ComplianceFramework };
    const { startTime, endTime } = request.body as { startTime: string; endTime: string };
    return aggregator.generateComplianceReport(
      tenantId,
      framework,
      new Date(startTime),
      new Date(endTime)
    );
  });

  // Forensic analysis endpoint
  app.get('/forensics/:tenantId/:correlationId', async (request) => {
    const { tenantId, correlationId } = request.params as { tenantId: string; correlationId: string };
    return aggregator.forensicAnalysis(correlationId, tenantId);
  });

  // Integrity verification endpoint
  app.post('/verify/:tenantId', async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    const { startTime, endTime } = request.body as { startTime?: string; endTime?: string };
    return aggregator.verifyIntegrity(
      tenantId,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined
    );
  });

  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'Unified Audit Server started');

  return app;
}

// Standalone server entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3200);

  (async () => {
    try {
      const aggregator = await createAuditAggregator();
      await createAuditServer(aggregator, port);

      // Graceful shutdown
      const shutdown = async () => {
        logger.info('Shutting down...');
        await aggregator.shutdown();
        process.exit(0);
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    } catch (error) {
      logger.error({ error }, 'Failed to start service');
      process.exit(1);
    }
  })();
}
