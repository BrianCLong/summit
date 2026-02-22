import { CronJob } from 'cron';
import { getPostgresPool } from '../db/postgres.js';
import { logger as baseLogger } from '../config/logger.js';
import { partitionManager } from '../db/partitioning.js';

const logger = baseLogger.child({ service: 'PartitionMaintenanceService' });

const TABLES_TO_MAINTAIN = [
  'provenance_ledger_v2',
];

export class PartitionMaintenanceService {
  private job: CronJob;

  constructor() {
    // Run daily at 2 AM
    this.job = new CronJob('0 2 * * *', () => {
      this.maintainPartitions().catch((err) => {
        logger.error({ err }, 'Partition maintenance job failed');
      });
    });
  }

  public start() {
    this.job.start();
    logger.info('PartitionMaintenanceService started');
    // Run once on startup to ensure coverage
    this.maintainPartitions().catch((err) => {
      logger.error({ err }, 'Initial partition maintenance failed');
    });
  }

  public stop() {
    this.job.stop();
  }

  public async maintainPartitions() {
    logger.info('Starting partition maintenance');
    const pool = getPostgresPool();

    // Outbox Events (using DB function)
    try {
      await pool.write('SELECT ensure_outbox_partition($1, $2)', [2, 6]);
      logger.info({ tableName: 'outbox_events' }, 'Partition maintenance successful');
    } catch (error) {
      logger.error({ tableName: 'outbox_events', error }, 'Failed to maintain partitions for table');
    }

    // Other tables maintained via PartitionManager
    try {
      await partitionManager.maintainPartitions(TABLES_TO_MAINTAIN);
      logger.info({ tables: TABLES_TO_MAINTAIN }, 'Standard partition maintenance successful');
    } catch (error) {
      logger.error({ error }, 'Failed to maintain standard partitions');
    }
  }
}

export const partitionMaintenanceService = new PartitionMaintenanceService();
