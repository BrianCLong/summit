/**
 * CompanyOS User and Role Sync Service
 * @module @intelgraph/companyos-sync
 */

export * from './types.js';
export * from './sync-service.js';

import { Pool } from 'pg';
import Redis from 'ioredis';
import pino from 'pino';
import { CompanyOSSyncService } from './sync-service.js';

const logger = pino({ name: 'companyos-sync' });

/**
 * Create and initialize a CompanyOS Sync Service instance
 */
export async function createSyncService(options?: {
  postgresUrl?: string;
  redisUrl?: string;
}): Promise<CompanyOSSyncService> {
  const postgres = new Pool({
    connectionString: options?.postgresUrl || process.env.DATABASE_URL,
  });

  const redis = new Redis(options?.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');

  const service = new CompanyOSSyncService({
    postgres,
    redis,
    logger,
  });

  await service.initialize();

  return service;
}

// Standalone server entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3100);

  (async () => {
    try {
      const service = await createSyncService();
      logger.info({ port }, 'CompanyOS Sync Service started');

      // Graceful shutdown
      process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, shutting down...');
        await service.shutdown();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        logger.info('Received SIGINT, shutting down...');
        await service.shutdown();
        process.exit(0);
      });
    } catch (error) {
      logger.error({ error }, 'Failed to start service');
      process.exit(1);
    }
  })();
}
