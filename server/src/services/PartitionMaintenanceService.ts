import { CronJob } from 'cron';
import { partitionManager } from '../db/partitioning.js';
import { logger as baseLogger } from '../config/logger.js';

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
      // Delegate to PartitionManager
      // We pass provenance_ledger_v2 explicitly to ensure it's maintained along with orchestrator tables
      await partitionManager.maintainPartitions(['provenance_ledger_v2']);

      logger.info('Partition maintenance completed successfully');
    } catch (error) {
      logger.error({ error }, 'Partition maintenance failed');
    }
  }
}

export const partitionMaintenanceService = new PartitionMaintenanceService();
