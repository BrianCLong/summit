
import { getPostgresPool } from './postgres.js';
import logger from '../utils/logger.js';
import { RedisService } from '../cache/redis.js';
import { coldStorageService } from '../services/ColdStorageService.js';

export class PartitionManager {
  private pool = getPostgresPool();
  private redis = RedisService.getInstance();

  /**
   * Creates a new partition for a specific tenant in the maestro_runs table.
   * Useful when onboarding a new tenant to ensure they have their own dedicated partition.
   */
  async createTenantPartition(tenantId: string): Promise<void> {
    const safeTenantId = tenantId.replace(/[^a-zA-Z0-9_]/g, '');
    const partitionName = `maestro_runs_${safeTenantId}`;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if partition exists
      const checkRes = await client.query(
        `SELECT to_regclass($1::text)`,
        [partitionName]
      );

      if (checkRes.rows[0].to_regclass) {
        logger.info(`Partition ${partitionName} already exists.`);
        await client.query('COMMIT');
        return;
      }

      const query = `
        CREATE TABLE ${partitionName}
        PARTITION OF maestro_runs
        FOR VALUES IN ('${tenantId}')
      `;

      await client.query(query);
      logger.info(`Created partition ${partitionName} for tenant ${tenantId}`);

      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error(`Failed to create partition for tenant ${tenantId}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Creates a monthly partition for a time-series table (e.g., audit_logs, metrics).
   * Range Partitioning: FOR VALUES FROM ('2023-01-01') TO ('2023-02-01')
   */
  async createMonthlyPartition(tableName: string, date: Date, suffixFormat: string = '_yYYYYmMM'): Promise<void> {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const suffix = suffixFormat
      .replace('YYYY', String(year))
      .replace('MM', month);

    const partitionName = `${tableName}${suffix}`;

    // Calculate range start and end
    const startObj = new Date(year, date.getMonth(), 1);
    const endObj = new Date(year, date.getMonth() + 1, 1); // First day of next month

    const startStr = startObj.toISOString().split('T')[0];
    const endStr = endObj.toISOString().split('T')[0];

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

       // Check if partition exists
       const checkRes = await client.query(
        `SELECT to_regclass($1::text)`,
        [partitionName]
      );

      if (checkRes.rows[0].to_regclass) {
        logger.info(`Partition ${partitionName} already exists.`);
        await client.query('COMMIT');
        return;
      }

      const query = `
        CREATE TABLE ${partitionName}
        PARTITION OF ${tableName}
        FOR VALUES FROM ('${startStr}') TO ('${endStr}')
      `;

      await client.query(query);
      logger.info(`Created monthly partition ${partitionName} (${startStr} to ${endStr})`);

      await client.query('COMMIT');
    } catch (error: any) {
       await client.query('ROLLBACK');
       // Don't log error if it's just that the parent table doesn't exist yet (might be dev env)
       if ((error as any).code === '42P01') {
           logger.warn(`Parent table ${tableName} does not exist. Skipping partition creation.`);
       } else {
           logger.error(`Failed to create partition ${partitionName}`, error);
           throw error;
       }
    } finally {
      client.release();
    }
  }

  /**
   * Creates a partition for a list of values.
   * Useful for region or category based partitioning.
   */
  async createListPartition(tableName: string, partitionKey: string, value: string): Promise<void> {
    const safeValue = value.replace(/'/g, "''"); // Sanitization for SQL string literal
    const safePartitionKey = partitionKey.replace(/[^a-zA-Z0-9_]/g, '');
    const partitionName = `${tableName}_${safePartitionKey}`;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if partition exists
      const checkRes = await client.query(
        `SELECT to_regclass($1::text)`,
        [partitionName]
      );

      if (checkRes.rows[0].to_regclass) {
        logger.info(`Partition ${partitionName} already exists.`);
        await client.query('COMMIT');
        return;
      }

      const query = `
        CREATE TABLE ${partitionName}
        PARTITION OF ${tableName}
        FOR VALUES IN ('${safeValue}')
      `;

      await client.query(query);
      logger.info(`Created list partition ${partitionName} for value ${value}`);

      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error(`Failed to create list partition ${partitionName}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Maintenance job to ensure upcoming partitions exist and detach/archive old ones.
   * Can be scheduled via pg-boss or node-cron.
   */
  async maintainPartitions(tables: string[] = ['audit_logs', 'metrics', 'provenance_ledger_v2']): Promise<void> {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthAfterNext = new Date(now.getFullYear(), now.getMonth() + 2, 1);

    for (const table of tables) {
        // Ensure current month exists
        await this.createMonthlyPartition(table, now);
        // Ensure next month exists (pre-creation)
        await this.createMonthlyPartition(table, nextMonth);
        // Ensure month after next exists (buffer)
        await this.createMonthlyPartition(table, monthAfterNext);
    }

    // Future: Logic to detach old partitions and move to cold storage (e.g. S3 parquet)
  }

  async detachOldPartitions(
    tables: string[],
    retentionMonths: number,
  ): Promise<void> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - retentionMonths);

    const client = await this.pool.connect();
    try {
      for (const table of tables) {
        const result = await client.query(
          'SELECT inhrelid::regclass::text AS partition_name FROM pg_inherits WHERE inhparent = $1::regclass',
          [table],
        );

        for (const row of result.rows ?? []) {
          const partitionName = row.partition_name as string;
          const match = partitionName.match(/_y(\d{4})m(\d{2})$/);
          if (!match) continue;

          const year = Number(match[1]);
          const month = Number(match[2]);
          const partitionDate = new Date(year, month - 1, 1);

          if (partitionDate <= cutoff) {
            await client.query(
              `ALTER TABLE ${table} DETACH PARTITION ${partitionName}`,
            );
            await coldStorageService.archivePartition(
              table,
              partitionName,
              true,
            );
          }
        }
      }
    } catch (error: any) {
      logger.error('Failed to detach old partitions', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export const partitionManager = new PartitionManager();
