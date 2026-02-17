import { CronJob } from 'cron';
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
    try {
        // Delegates logic to PartitionManager which handles time-series tables and outbox
        await partitionManager.maintainPartitions();
        logger.info('Partition maintenance completed successfully');
    } catch (error) {
        logger.error({ error }, 'Partition maintenance failed');
    }
  }
}

export const partitionMaintenanceService = new PartitionMaintenanceService();
