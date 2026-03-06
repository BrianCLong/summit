import { CronJob } from 'cron';
import { getPostgresPool } from '../db/postgres.js';
import { logger as baseLogger } from '../config/logger.js';
import { PartitionManager, PartitionOptions } from '../orchestrator/PartitionManager.js';

const logger = baseLogger.child({ service: 'PartitionMaintenanceService' });

const TABLES_CONFIG: Record<string, PartitionOptions> = {
  'provenance_ledger_v2': {}, // Default suffix _yYYYYmMM
  'audit_logs': {}, // Default suffix
  'orchestrator_events_p': { stripSuffix: '_p', suffixFormat: '_YYYY_MM' },
  'orchestrator_outbox_p': { stripSuffix: '_p', suffixFormat: '_YYYY_MM' }
};

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
    const managedPool = getPostgresPool();
    // Use the underlying write pool for DDL operations
    const partitionManager = new PartitionManager(managedPool.pool);

    // Outbox Events (using DB function - keeping legacy support)
    try {
      await managedPool.write('SELECT ensure_outbox_partition($1, $2)', [2, 6]);
      logger.info({ tableName: 'outbox_events' }, 'Partition maintenance successful (DB function)');
    } catch (error) {
      logger.error({ tableName: 'outbox_events', error }, 'Failed to maintain partitions for table (DB function)');
    }

    // Generic Partition Management
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthAfterNext = new Date(now.getFullYear(), now.getMonth() + 2, 1);

    for (const [tableName, options] of Object.entries(TABLES_CONFIG)) {
      try {
        // Ensure next month
        await partitionManager.ensureMonthlyPartition(tableName, nextMonth, options);
        // Ensure month after next (buffer)
        await partitionManager.ensureMonthlyPartition(tableName, monthAfterNext, options);

        logger.info({ tableName }, 'Partition maintenance successful');
      } catch (error) {
        logger.error({ tableName, error }, 'Failed to maintain partitions for table');
      }
    }
  }
}

export const partitionMaintenanceService = new PartitionMaintenanceService();
