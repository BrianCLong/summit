import { CronJob } from 'cron';
import { logger as baseLogger } from '../config/logger.js';
import { partitionManager } from '../db/partitioning.js';

const logger = baseLogger.child({ service: 'PartitionMaintenanceService' });

const TABLES_TO_MAINTAIN = [
  'provenance_ledger_v2',
  'audit_logs',
  'metrics'
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
        // Outbox Events
        await partitionManager.maintainOutboxPartitions(2, 6);

        // Other tables
        await partitionManager.maintainPartitions(TABLES_TO_MAINTAIN);

        logger.info('Partition maintenance completed');
    } catch (error) {
        logger.error({ error }, 'Partition maintenance encountered an error');
        // We catch here but the cron job also has a catch.
        // Rethrowing might be appropriate if we want the job handler to know.
        throw error;
    }
  }
}

export const partitionMaintenanceService = new PartitionMaintenanceService();
