import { CronJob } from 'cron';
import { getPostgresPool } from '../db/postgres.ts';
import { logger as baseLogger } from '../config/logger.ts';

const logger = baseLogger.child({ service: 'PartitionMaintenanceService' });

const TABLES_TO_MAINTAIN = [
  'outbox_events',
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

    for (const tableName of TABLES_TO_MAINTAIN) {
      try {
        await this.ensureNextMonthPartition(pool, tableName);
      } catch (error) {
        logger.error({ tableName, error }, 'Failed to maintain partitions for table');
      }
    }
  }

  private async ensureNextMonthPartition(pool: any, tableName: string) {
    // Calculate dates for next month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);

    const partitionName = `${tableName}_y${nextMonth.getFullYear()}m${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    const startStr = nextMonth.toISOString().split('T')[0];
    const endStr = nextNextMonth.toISOString().split('T')[0];

    logger.debug({ tableName, partitionName }, 'Checking partition existence');

    const checkSql = `
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE tablename = $1
      );
    `;

    const result = await pool.read(checkSql, [partitionName]);
    const exists = result.rows[0].exists;

    if (!exists) {
      logger.info({ tableName, partitionName }, 'Creating new partition');
      const createSql = `
        CREATE TABLE IF NOT EXISTS ${partitionName}
        PARTITION OF ${tableName}
        FOR VALUES FROM ('${startStr}') TO ('${endStr}');
      `;
      // Use write pool
      await pool.write(createSql);
      logger.info({ tableName, partitionName }, 'Partition created successfully');
    } else {
      logger.debug({ tableName, partitionName }, 'Partition already exists');
    }
  }
}

export const partitionMaintenanceService = new PartitionMaintenanceService();
