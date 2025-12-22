
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

      // Detach from default if needed? No, LIST partitioning doesn't auto-move from default.
      // We are creating a specific partition.
      // Note: If rows for this tenant already exist in 'default', this CREATE might fail
      // or require moving rows. For now, we assume this is done before data ingestion.

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
   * Example of Time-Based Partitioning maintenance (if we had a time-partitioned table)
   */
  async createMonthlyPartition(tableName: string, date: Date): Promise<void> {
    // Implementation placeholder for future time-series tables
    // e.g., audit_logs could be partitioned by range (created_at)
  }
}

export const partitionManager = new PartitionManager();
