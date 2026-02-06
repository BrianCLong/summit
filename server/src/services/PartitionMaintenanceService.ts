import { CronJob } from 'cron';
import { getPostgresPool } from '../db/postgres.js';
import { logger as baseLogger } from '../config/logger.js';

const logger = baseLogger.child({ service: 'PartitionMaintenanceService' });

const TABLES_TO_MAINTAIN = [
  'provenance_ledger_v2',
  'orchestrator_events',
  'orchestrator_outbox'
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

  public async maintainPartitions(poolArg?: any) {
    logger.info('Starting partition maintenance');
    const pool = poolArg || getPostgresPool();

    // Unified maintenance for all range-partitioned tables
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

    // Support both naming conventions found in the codebase
    // Standard: table_yYYYYmMM
    // Migration: table_YYYY_MM
    const year = nextMonth.getFullYear();
    const month = String(nextMonth.getMonth() + 1).padStart(2, '0');

    const partitionNameStd = `${tableName}_y${year}m${month}`;
    const partitionNameMig = `${tableName}_${year}_${month}`;

    const startStr = nextMonth.toISOString().split('T')[0];
    const endStr = nextNextMonth.toISOString().split('T')[0];

    logger.debug({ tableName }, 'Checking partition existence');

    try {
        const checkSql = `
          SELECT EXISTS (
            SELECT FROM pg_tables
            WHERE tablename = $1 OR tablename = $2
          );
        `;

        const result = await pool.read(checkSql, [partitionNameStd, partitionNameMig]);
        const exists = result.rows[0].exists;

        if (!exists) {
          logger.info({ tableName, partitionName: partitionNameStd }, 'Creating new partition');
          const createSql = `
            CREATE TABLE IF NOT EXISTS ${partitionNameStd}
            PARTITION OF ${tableName}
            FOR VALUES FROM ('${startStr}') TO ('${endStr}');
          `;
          // Use write pool
          await pool.write(createSql);
          logger.info({ tableName, partitionName: partitionNameStd }, 'Partition created successfully');
        } else {
          logger.debug({ tableName }, 'Partition already exists');
        }
    } catch (error: any) {
        // If parent table doesn't exist, log warning but don't fail hard
        // 42P01 is undefined_table
        if (error.code === '42P01') {
            logger.warn({ tableName }, 'Parent table does not exist, skipping partition maintenance');
        } else {
            throw error;
        }
    }
  }
}

export const partitionMaintenanceService = new PartitionMaintenanceService();
