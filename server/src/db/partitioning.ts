
import { getPostgresPool } from './postgres.js';
import logger from '../utils/logger.js';

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
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to create partition for tenant ${tenantId}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a monthly range partition for a table (e.g., audit_logs)
   */
  async createMonthlyPartition(tableName: string, date: Date): Promise<void> {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const partitionName = `${tableName}_y${year}m${month}`;

    const startStr = `${year}-${month}-01`;
    // Calculate next month
    const nextMonthDate = new Date(year, date.getMonth() + 1, 1);
    const endYear = nextMonthDate.getFullYear();
    const endMonth = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
    const endStr = `${endYear}-${endMonth}-01`;

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
      logger.info(`Created range partition ${partitionName} for ${tableName} (${startStr} to ${endStr})`);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to create monthly partition for ${tableName} (${year}-${month})`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create partitions for upcoming months (maintenance task)
   */
  async ensureFuturePartitions(tableName: string, monthsAhead: number = 3): Promise<void> {
      const now = new Date();
      for (let i = 0; i <= monthsAhead; i++) {
          const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
          await this.createMonthlyPartition(tableName, targetDate);
      }
  }
}

export const partitionManager = new PartitionManager();
