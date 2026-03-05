import { CronJob } from 'cron';
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

    try {
        // Create upcoming partitions
        await partitionManager.maintainPartitions(TABLES_TO_MAINTAIN);
        logger.info('Upcoming partitions ensured');

        // Archive old partitions (e.g., keep 12 months)
        // Configuration could be dynamic, defaulting to 12 months
        const retentionMonths = process.env.PARTITION_RETENTION_MONTHS ? parseInt(process.env.PARTITION_RETENTION_MONTHS) : 12;
        await partitionManager.detachOldPartitions(TABLES_TO_MAINTAIN, retentionMonths);
        logger.info('Old partitions cleanup completed');

    } catch (error) {
        logger.error({ error }, 'Partition maintenance failed');
    }
  }
}

export const partitionMaintenanceService = new PartitionMaintenanceService();
