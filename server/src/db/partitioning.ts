
import { getPostgresPool } from './postgres.js';
import logger from '../utils/logger.js';
import { coldStorageService } from '../services/ColdStorageService.js';

export class PartitionManager {
  private pool = getPostgresPool();

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
   * Creates a monthly partition for a time-series table.
   */
  async createMonthlyPartition(
    tableName: string,
    date: Date,
    format: 'standard' | 'orchestrator' = 'standard'
  ): Promise<void> {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    let partitionName: string;
    if (format === 'orchestrator') {
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
        // Partition exists
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
       if ((error as any).code === '42P01') { // undefined_table
           logger.debug(`Parent table ${tableName} does not exist. Skipping partition creation.`);
       } else {
           logger.error(`Failed to create partition ${partitionName}`, error);
           throw error;
       }
    } finally {
      client.release();
    }
  }

  /**
   * Maintenance job to ensure upcoming partitions exist and detach/archive old ones.
   */
  async maintainPartitions(): Promise<void> {
    const standardTables = ['audit_logs', 'metrics', 'provenance_ledger_v2'];
    const orchestratorTables = ['orchestrator_events_p', 'orchestrator_outbox_p'];

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthAfterNext = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const dates = [now, nextMonth, monthAfterNext];

    for (const table of standardTables) {
        for (const date of dates) {
            await this.createMonthlyPartition(table, date, 'standard');
        }
    }

    for (const table of orchestratorTables) {
        for (const date of dates) {
            await this.createMonthlyPartition(table, date, 'orchestrator');
        }
    }

    // Detach old partitions (example: 12 months retention)
    await this.detachOldPartitions(standardTables, 12);
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
        // Only check standard tables for now as regex assumes standard format
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
            logger.info(`Detached and archived partition ${partitionName}`);
          }
        }
      }
    } catch (error: any) {
       // Ignore if table doesn't exist
       if (error.code !== '42P01') {
          logger.error('Failed to detach old partitions', error);
       }
    } finally {
      client.release();
    }
  }
}

export const partitionManager = new PartitionManager();
