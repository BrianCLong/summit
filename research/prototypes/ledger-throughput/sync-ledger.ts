
import { Pool } from 'pg';
import crypto from 'crypto';

// Minimal mock of the current synchronous ledger
export class SyncLedger {
  private pool: Pool;
  private tableName = 'research_sync_ledger';

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        sequence_number BIGINT NOT NULL,
        previous_hash TEXT NOT NULL,
        current_hash TEXT NOT NULL,
        payload JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_tenant_seq ON ${this.tableName} (tenant_id, sequence_number DESC);
    `);
  }

  async append(tenantId: string, payload: any) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const last = await client.query(
        `SELECT sequence_number, current_hash FROM ${this.tableName} WHERE tenant_id = $1 ORDER BY sequence_number DESC LIMIT 1 FOR UPDATE`,
        [tenantId]
      );

      let seq = 1n;
      let prevHash = '0'.repeat(64);

      if (last.rows.length > 0) {
        seq = BigInt(last.rows[0].sequence_number) + 1n;
        prevHash = last.rows[0].current_hash;
      }

      const currentHash = crypto.createHash('sha256').update(prevHash + JSON.stringify(payload)).digest('hex');

      await client.query(
        `INSERT INTO ${this.tableName} (tenant_id, sequence_number, previous_hash, current_hash, payload) VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, seq.toString(), prevHash, currentHash, JSON.stringify(payload)]
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
