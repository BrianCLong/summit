
import { getPostgresPool } from './postgres.js';
import logger from '../config/logger.js';
import { RedisService } from '../cache/redis.js';
import { coldStorageService } from '../services/ColdStorageService.js';

export class PartitionManager {
  private pool = getPostgresPool();
  private redis = RedisService.getInstance();

  /**
   * Creates a new partition for a specific tenant in the maestro_runs table.
   */
  async createTenantPartition(tenantId: string): Promise<void> {
    const safeTenantId = tenantId.replace(/[^a-zA-Z0-9_]/g, '');
    const partitionName = `maestro_runs_${safeTenantId}`;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

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
   * Creates a monthly partition for a time-series table.
   * Uses UTC dates for consistency.
   */
  async createMonthlyPartition(tableName: string, date: Date): Promise<void> {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const partitionName = `${tableName}_y${year}m${month}`;

    const startObj = new Date(Date.UTC(year, date.getUTCMonth(), 1));
    const endObj = new Date(Date.UTC(year, date.getUTCMonth() + 1, 1));

    const startStr = startObj.toISOString().split('T')[0];
    const endStr = endObj.toISOString().split('T')[0];

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

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

  async maintainPartitions(tables: string[] = ['provenance_ledger_v2']): Promise<void> {
    const now = new Date();
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const monthAfterNext = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1));

    for (const table of tables) {
        await this.createMonthlyPartition(table, now);
        await this.createMonthlyPartition(table, nextMonth);
        await this.createMonthlyPartition(table, monthAfterNext);
    }
  }

  /**
   * Detaches and archives partitions older than the retention period.
   */
  async detachOldPartitions(
    tables: string[],
    retentionMonths: number,
  ): Promise<void> {
    const now = new Date();
    const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - retentionMonths, 1));

    logger.info({ tables, retentionMonths, cutoff: cutoff.toISOString() }, 'Starting partition cleanup');

    for (const table of tables) {
        let partitionsToProcess: string[] = [];

        // Fetch partitions first, then release client
        const client = await this.pool.connect();
        try {
            const checkTable = await client.query(`SELECT to_regclass($1::text)`, [table]);
            if (!checkTable.rows[0].to_regclass) {
                 logger.warn(`Table ${table} does not exist, skipping cleanup.`);
                 continue;
            }

            const result = await client.query(
              'SELECT inhrelid::regclass::text AS partition_name FROM pg_inherits WHERE inhparent = $1::regclass',
              [table],
            );
            partitionsToProcess = result.rows.map(r => r.partition_name);
        } catch (error: any) {
             logger.error({ table, error }, 'Failed to fetch partitions');
             continue;
        } finally {
             client.release();
        }

        // Process partitions one by one
        for (const partitionName of partitionsToProcess) {
            const match = partitionName.match(/_y(\d{4})m(\d{2})$/);
            if (!match) continue;

            const year = Number(match[1]);
            const month = Number(match[2]);
            const partitionDate = new Date(Date.UTC(year, month - 1, 1));

            if (partitionDate <= cutoff) {
                logger.info({ partitionName, table }, 'Found old partition to archive');
                await this.safeDetachAndArchive(table, partitionName);
            }
        }
    }
  }

  private async safeDetachAndArchive(table: string, partitionName: string): Promise<void> {
      // Get a new client for this operation
      const client = await this.pool.connect();
      try {
          // 1. Detach (requires transaction)
          await client.query('BEGIN');
          await client.query(`ALTER TABLE ${table} DETACH PARTITION ${partitionName}`);
          await client.query('COMMIT');
          logger.info({ partitionName }, 'Detached partition from parent table');
      } catch (e) {
          await client.query('ROLLBACK');
          logger.error({ error: e, partitionName }, 'Failed to detach partition');
          client.release();
          return; // Stop here
      }

      // Release client while archiving (which might take long)
      client.release();

      // 2. Archive
      try {
         // We pass `false` to dropAfterArchive because we handle dropping here manually
         await coldStorageService.archivePartition(table, partitionName, false, 'GLACIER');
         logger.info({ partitionName }, 'Archived partition to S3');
      } catch (archiveError) {
         logger.error({ error: archiveError, partitionName }, 'Failed to archive detached partition. It is now a standalone table.');
         return;
      }

      // 3. Drop
      const dropClient = await this.pool.connect();
      try {
          await dropClient.query('BEGIN');
          await dropClient.query(`DROP TABLE IF EXISTS ${partitionName}`);
          await dropClient.query('COMMIT');
          logger.info({ partitionName }, 'Dropped archived partition table');
      } catch (e) {
          await dropClient.query('ROLLBACK');
          logger.error({ error: e, partitionName }, 'Failed to drop partition after archive');
          // At this point, it is archived but not dropped. Safe to leave it or retry later.
      } finally {
          dropClient.release();
      }
  }
}

export const partitionManager = new PartitionManager();
