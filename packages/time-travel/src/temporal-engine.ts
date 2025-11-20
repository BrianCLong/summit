/**
 * Temporal Query Engine
 *
 * Enables querying data as it existed at specific points in time
 */

import { Pool } from 'pg';

export interface TemporalTable {
  tableName: string;
  temporalColumn: string;
  retentionDays: number;
  snapshotInterval?: 'hour' | 'day' | 'week';
}

export class TemporalEngine {
  constructor(private pool: Pool) {}

  /**
   * Enable time-travel for a table
   */
  async enableTimeTravelForTable(config: TemporalTable): Promise<void> {
    const { tableName, temporalColumn } = config;

    // Add temporal columns if they don't exist
    await this.pool.query(`
      ALTER TABLE ${tableName}
      ADD COLUMN IF NOT EXISTS ${temporalColumn}_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS ${temporalColumn}_end TIMESTAMP DEFAULT '9999-12-31'::TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE
    `);

    // Create history table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName}_history (
        LIKE ${tableName} INCLUDING ALL
      )
    `);

    // Create trigger to track changes
    await this.createHistoryTrigger(tableName, temporalColumn);

    // Create indexes for efficient temporal queries
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_${tableName}_temporal
      ON ${tableName}(${temporalColumn}_start, ${temporalColumn}_end);

      CREATE INDEX IF NOT EXISTS idx_${tableName}_current
      ON ${tableName}(is_current) WHERE is_current = TRUE;
    `);
  }

  /**
   * Query data as of a specific timestamp
   */
  async queryAsOf(
    tableName: string,
    timestamp: Date,
    filters?: string,
  ): Promise<any[]> {
    const whereClause = filters ? `AND ${filters}` : '';

    const result = await this.pool.query(`
      SELECT *
      FROM ${tableName}
      WHERE valid_time_start <= $1
        AND valid_time_end > $1
        ${whereClause}
    `, [timestamp]);

    return result.rows;
  }

  /**
   * Query data between two timestamps
   */
  async queryBetween(
    tableName: string,
    startTime: Date,
    endTime: Date,
    filters?: string,
  ): Promise<any[]> {
    const whereClause = filters ? `AND ${filters}` : '';

    const result = await this.pool.query(`
      SELECT *
      FROM ${tableName}
      WHERE (valid_time_start <= $2 AND valid_time_end > $1)
        ${whereClause}
      ORDER BY valid_time_start
    `, [startTime, endTime]);

    return result.rows;
  }

  /**
   * Get history of a specific record
   */
  async getRecordHistory(
    tableName: string,
    primaryKey: Record<string, any>,
  ): Promise<any[]> {
    const pkConditions = Object.entries(primaryKey)
      .map(([key, value]) => `${key} = '${value}'`)
      .join(' AND ');

    const result = await this.pool.query(`
      SELECT * FROM ${tableName}
      WHERE ${pkConditions}
      ORDER BY valid_time_start
    `);

    return result.rows;
  }

  /**
   * Compare data between two timestamps
   */
  async compareTimestamps(
    tableName: string,
    timestamp1: Date,
    timestamp2: Date,
  ): Promise<{
    added: any[];
    removed: any[];
    modified: any[];
  }> {
    const data1 = await this.queryAsOf(tableName, timestamp1);
    const data2 = await this.queryAsOf(tableName, timestamp2);

    // Assuming first column is primary key
    const pk = Object.keys(data1[0] || {})[0];

    const ids1 = new Set(data1.map((r) => r[pk]));
    const ids2 = new Set(data2.map((r) => r[pk]));

    const added = data2.filter((r) => !ids1.has(r[pk]));
    const removed = data1.filter((r) => !ids2.has(r[pk]));

    const modified = data2.filter((r2) => {
      const r1 = data1.find((r) => r[pk] === r2[pk]);
      if (!r1) return false;

      return JSON.stringify(r1) !== JSON.stringify(r2);
    });

    return { added, removed, modified };
  }

  /**
   * Create history tracking trigger
   */
  private async createHistoryTrigger(
    tableName: string,
    temporalColumn: string,
  ): Promise<void> {
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION ${tableName}_history_trigger()
      RETURNS TRIGGER AS $$
      BEGIN
        IF (TG_OP = 'UPDATE') THEN
          -- Mark old version as not current
          UPDATE ${tableName}
          SET ${temporalColumn}_end = CURRENT_TIMESTAMP,
              is_current = FALSE
          WHERE id = OLD.id AND is_current = TRUE;

          -- Copy to history
          INSERT INTO ${tableName}_history SELECT OLD.*;

          -- Set new version timestamps
          NEW.${temporalColumn}_start = CURRENT_TIMESTAMP;
          NEW.${temporalColumn}_end = '9999-12-31'::TIMESTAMP;
          NEW.is_current = TRUE;
        ELSIF (TG_OP = 'DELETE') THEN
          -- Mark as deleted
          UPDATE ${tableName}
          SET ${temporalColumn}_end = CURRENT_TIMESTAMP,
              is_current = FALSE
          WHERE id = OLD.id;

          -- Copy to history
          INSERT INTO ${tableName}_history SELECT OLD.*;

          RETURN OLD;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS ${tableName}_history_trigger ON ${tableName};

      CREATE TRIGGER ${tableName}_history_trigger
      BEFORE UPDATE OR DELETE ON ${tableName}
      FOR EACH ROW
      EXECUTE FUNCTION ${tableName}_history_trigger();
    `);
  }

  /**
   * Restore data from a specific timestamp
   */
  async restoreFromTimestamp(
    tableName: string,
    timestamp: Date,
  ): Promise<number> {
    // Get data as it was at that time
    const historicalData = await this.queryAsOf(tableName, timestamp);

    // Begin transaction
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Clear current data
      await client.query(`DELETE FROM ${tableName} WHERE is_current = TRUE`);

      // Restore historical data
      for (const row of historicalData) {
        const columns = Object.keys(row).filter(
          (k) => !k.startsWith('valid_time'),
        );
        const values = columns.map((c) => row[c]);

        await client.query(
          `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})`,
          values,
        );
      }

      await client.query('COMMIT');

      return historicalData.length;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get temporal statistics
   */
  async getTemporalStats(tableName: string): Promise<{
    currentRecords: number;
    historicalRecords: number;
    oldestRecord: Date;
    newestRecord: Date;
    totalVersions: number;
  }> {
    const stats = await this.pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_current = TRUE) as current_records,
        COUNT(*) as total_versions,
        MIN(valid_time_start) as oldest_record,
        MAX(valid_time_start) as newest_record
      FROM ${tableName}
    `);

    const historyCount = await this.pool.query(`
      SELECT COUNT(*) as count FROM ${tableName}_history
    `);

    return {
      currentRecords: parseInt(stats.rows[0].current_records),
      historicalRecords: parseInt(historyCount.rows[0].count),
      oldestRecord: stats.rows[0].oldest_record,
      newestRecord: stats.rows[0].newest_record,
      totalVersions: parseInt(stats.rows[0].total_versions),
    };
  }
}
