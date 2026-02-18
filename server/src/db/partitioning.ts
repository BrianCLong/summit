
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
        logger.debug(`Partition ${partitionName} already exists.`);
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
   * Creates a monthly partition for a time-series table.
   * Range Partitioning: FOR VALUES FROM ('2023-01-01') TO ('2023-02-01')
   *
   * @param tableName The parent table name
   * @param date The date falling within the desired month (usually first day of month)
   * @param suffixFormat 'yNmN' (e.g. _y2023m01) or 'YYYY_MM' (e.g. _2023_01, stripping _p suffix from table name)
   */
  async createMonthlyPartition(
    tableName: string,
    date: Date,
    suffixFormat: 'yNmN' | 'YYYY_MM' = 'yNmN'
  ): Promise<void> {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    let partitionName = '';

    if (suffixFormat === 'YYYY_MM') {
      // Remove '_p' suffix if present for the base name
      const baseName = tableName.replace(/_p$/, '');
      partitionName = `${baseName}_${year}_${month}`;
    } else {
      partitionName = `${tableName}_y${year}m${month}`;
    }

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
        logger.debug(`Partition ${partitionName} already exists.`);
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
   * Helper to ensure partition for a specific month exists
   */
  async ensurePartitionForMonth(tableName: string, date: Date, suffixFormat: 'yNmN' | 'YYYY_MM' = 'yNmN'): Promise<void> {
    return this.createMonthlyPartition(tableName, date, suffixFormat);
  }

  /**
   * Maintenance job to ensure upcoming partitions exist and detach/archive old ones.
   */
  async maintainPartitions(tables: string[] = ['audit_logs', 'metrics', 'provenance_ledger_v2']): Promise<void> {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthAfterNext = new Date(now.getFullYear(), now.getMonth() + 2, 1);

    for (const table of tables) {
        // Use default suffix format for standard tables
        await this.createMonthlyPartition(table, now);
        await this.createMonthlyPartition(table, nextMonth);
        await this.createMonthlyPartition(table, monthAfterNext);
    }

    // Specifically handle orchestrator tables with 'YYYY_MM' format
    const orchestratorTables = ['orchestrator_events_p', 'orchestrator_outbox_p'];
    for (const table of orchestratorTables) {
      await this.createMonthlyPartition(table, now, 'YYYY_MM');
      await this.createMonthlyPartition(table, nextMonth, 'YYYY_MM');
      await this.createMonthlyPartition(table, monthAfterNext, 'YYYY_MM');
    }

    // Future: Logic to detach old partitions and move to cold storage
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

          // Match standard format
          let match = partitionName.match(/_y(\d{4})m(\d{2})$/);

          // Fallback to YYYY_MM format if standard didn't match
          if (!match) {
             match = partitionName.match(/_(\d{4})_(\d{2})$/);
          }

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
