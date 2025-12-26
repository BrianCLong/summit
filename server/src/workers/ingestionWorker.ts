
import { Worker } from 'bullmq';
import { getRedisClient } from '../config/database.js';
import logger from '../utils/logger.js';
import { ingestionProcessor } from '../jobs/processors/ingestionProcessor.js';
import { initializeNeo4jDriver, closeNeo4jDriver } from '../db/neo4j.js';
import { bootstrapSecrets } from '../bootstrap-secrets.js';

const startWorker = async () => {
    await bootstrapSecrets();

    // Initialize DB connections needed by processor (via Services)
    await initializeNeo4jDriver();

    const connection = getRedisClient();
    if (!connection) {
        logger.error('Redis not available, exiting');
        process.exit(1);
    }

    const worker = new Worker('evidence-ingestion', ingestionProcessor, {
       connection,
       concurrency: 5
    });

    worker.on('completed', job => {
      logger.info({ jobId: job.id }, 'Ingestion job completed');
    });

    worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err }, 'Ingestion job failed');
    });

    logger.info('Ingestion Worker Started');

    const shutdown = async () => {
        logger.info('Shutting down ingestion worker...');
        await worker.close();
        await closeNeo4jDriver();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};

startWorker().catch(err => {
    logger.error('Worker failed to start', err);
    process.exit(1);
});
