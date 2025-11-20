/**
 * SnapshotStore - Manage aggregate snapshots for performance
 *
 * Store and retrieve aggregate snapshots to optimize loading
 */

import { Pool } from 'pg';
import pino from 'pino';
import type { Snapshot, EventStoreConfig } from '../store/types.js';

export class SnapshotStore {
  private pool: Pool;
  private logger: pino.Logger;
  private schema: string;

  constructor(config: EventStoreConfig) {
    this.schema = config.schema || 'public';
    this.logger = pino({ name: 'SnapshotStore' });
    this.pool = new Pool({
      connectionString: config.connectionString
    });
  }

  /**
   * Save a snapshot
   */
  async saveSnapshot<T = any>(snapshot: Snapshot<T>): Promise<void> {
    await this.pool.query(
      `INSERT INTO ${this.schema}.snapshots (
        aggregate_id, aggregate_type, version, timestamp, state
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (aggregate_id, version) DO UPDATE
      SET state = EXCLUDED.state, timestamp = EXCLUDED.timestamp`,
      [
        snapshot.aggregateId,
        snapshot.aggregateType,
        snapshot.version,
        snapshot.timestamp,
        JSON.stringify(snapshot.state)
      ]
    );

    this.logger.debug(
      { aggregateId: snapshot.aggregateId, version: snapshot.version },
      'Snapshot saved'
    );
  }

  /**
   * Get latest snapshot for an aggregate
   */
  async getLatestSnapshot<T = any>(
    aggregateId: string
  ): Promise<Snapshot<T> | null> {
    const result = await this.pool.query(
      `SELECT aggregate_id, aggregate_type, version, timestamp, state
       FROM ${this.schema}.snapshots
       WHERE aggregate_id = $1
       ORDER BY version DESC
       LIMIT 1`,
      [aggregateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      version: row.version,
      timestamp: row.timestamp,
      state: row.state
    };
  }

  /**
   * Get snapshot at specific version
   */
  async getSnapshot<T = any>(
    aggregateId: string,
    version: number
  ): Promise<Snapshot<T> | null> {
    const result = await this.pool.query(
      `SELECT aggregate_id, aggregate_type, version, timestamp, state
       FROM ${this.schema}.snapshots
       WHERE aggregate_id = $1 AND version <= $2
       ORDER BY version DESC
       LIMIT 1`,
      [aggregateId, version]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      version: row.version,
      timestamp: row.timestamp,
      state: row.state
    };
  }

  /**
   * Delete snapshots for an aggregate
   */
  async deleteSnapshots(aggregateId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM ${this.schema}.snapshots WHERE aggregate_id = $1`,
      [aggregateId]
    );

    this.logger.debug({ aggregateId }, 'Snapshots deleted');
  }

  /**
   * Delete old snapshots (keep only N latest per aggregate)
   */
  async pruneSnapshots(keepCount: number = 3): Promise<number> {
    const result = await this.pool.query(`
      WITH ranked_snapshots AS (
        SELECT aggregate_id, version,
               ROW_NUMBER() OVER (
                 PARTITION BY aggregate_id ORDER BY version DESC
               ) as rn
        FROM ${this.schema}.snapshots
      )
      DELETE FROM ${this.schema}.snapshots
      WHERE (aggregate_id, version) IN (
        SELECT aggregate_id, version
        FROM ranked_snapshots
        WHERE rn > $1
      )
    `, [keepCount]);

    const deletedCount = result.rowCount || 0;
    this.logger.info({ deletedCount, keepCount }, 'Snapshots pruned');

    return deletedCount;
  }

  /**
   * Close the snapshot store
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.logger.info('SnapshotStore closed');
  }
}
