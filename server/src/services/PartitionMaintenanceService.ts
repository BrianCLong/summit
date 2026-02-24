import { CronJob } from 'cron';
import { getPostgresPool } from '../db/postgres.js';
import { logger as baseLogger } from '../config/logger.js';
import { partitionManager } from '../db/partitioning.js';

const logger = baseLogger.child({ service: 'PartitionMaintenanceService' });

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

    // Preserve existing outbox_events maintenance via stored proc
    try {
      await pool.write('SELECT ensure_outbox_partition($1, $2)', [2, 6]);
      logger.info({ tableName: 'outbox_events' }, 'Partition maintenance successful');
    } catch (error: any) {
      // Ignore if function doesn't exist (dev env)
      if (error.code !== '42883') {
          logger.error({ tableName: 'outbox_events', error }, 'Failed to maintain partitions for table');
      }
    }

    // Use centralized manager for other tables
    try {
        await partitionManager.maintainPartitions();
        logger.info('General partition maintenance completed via PartitionManager');
    } catch (error) {
        logger.error({ error }, 'General partition maintenance failed');
    }
  }
}

export const partitionMaintenanceService = new PartitionMaintenanceService();
