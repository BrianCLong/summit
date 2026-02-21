import { CronJob } from 'cron';
import { getPostgresPool } from '../db/postgres.js';
import { logger as baseLogger } from '../config/logger.js';
import { partitionManager } from '../db/partitioning.js';

const logger = baseLogger.child({ service: 'PartitionMaintenanceService' });

const TABLES_TO_MAINTAIN = [
  'provenance_ledger_v2',
  'audit_logs',
  'metrics',
  'orchestrator_events_p',
  'orchestrator_outbox_p',
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

    // Outbox Events (using DB function - likely legacy or specific handling)
    try {
      await pool.write('SELECT ensure_outbox_partition($1, $2)', [2, 6]);
      logger.info({ tableName: 'outbox_events' }, 'Partition maintenance successful');
    } catch (error) {
      logger.error({ tableName: 'outbox_events', error }, 'Failed to maintain partitions for table');
    }

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthAfterNext = new Date(now.getFullYear(), now.getMonth() + 2, 1);

    // Other tables (using PartitionManager)
    for (const tableName of TABLES_TO_MAINTAIN) {
      try {
        const options = (tableName === 'orchestrator_events_p' || tableName === 'orchestrator_outbox_p')
            ? { suffixFormat: '_YYYY_MM' }
            : {};

        // Maintain current, next, and future month partitions
        await partitionManager.ensureMonthlyPartition(tableName, now, options);
        await partitionManager.ensureMonthlyPartition(tableName, nextMonth, options);
        await partitionManager.ensureMonthlyPartition(tableName, monthAfterNext, options);
      } catch (error) {
        logger.error({ tableName, error }, 'Failed to maintain partitions for table');
      }
    }
  }
}

export const partitionMaintenanceService = new PartitionMaintenanceService();
