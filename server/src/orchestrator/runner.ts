import { Pool } from 'pg';
import os from 'os';
import { PostgresStore } from './PostgresStore.js';
import { MaestroWorker } from './maestro-worker.js';
import { OrchestratorRetentionWorker } from './retention-worker.js';
import { PartitionManager } from './PartitionManager.js';
import logger from '../config/logger.js';
import { getPostgresPool } from '../db/postgres.js';

let maestroWorker: MaestroWorker | null = null;
let retentionWorker: OrchestratorRetentionWorker | null = null;
let partitionManager: PartitionManager | null = null;

export async function startOrchestratorWorkers() {
    try {
        const pool = getPostgresPool();
        const store = new PostgresStore(pool.pool);
        partitionManager = new PartitionManager(pool.pool);

        // 1. Ensure Partitions exist
        await partitionManager.ensurePartitions();

        const workerId = `worker-${os.hostname()}-${process.pid}`;

        // 2. Start Maestro Worker
        maestroWorker = new MaestroWorker(store, {
            workerId,
            concurrency: 5,
            pollIntervalMs: 5000,
            leaseDurationMs: 60000,
            heartbeatIntervalMs: 25000,
            batchSize: 5
        });

        maestroWorker.start().catch(err => logger.error({ err }, 'Maestro worker crash'));

        // 3. Start Retention Worker
        retentionWorker = new OrchestratorRetentionWorker(store);
        retentionWorker.start().catch(err => logger.error({ err }, 'Retention worker crash'));

        logger.info('Orchestrator workers initialized with PartitionManager');
    } catch (error) {
        logger.error({ err: error }, 'Failed to start orchestrator workers');
    }
}

export async function stopOrchestratorWorkers() {
    if (maestroWorker) await maestroWorker.stop();
    if (retentionWorker) await retentionWorker.stop();
}
