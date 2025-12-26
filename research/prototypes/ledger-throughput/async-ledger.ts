
import { Pool } from 'pg';
import crypto from 'crypto';

// Minimal mock of the proposed async batched ledger
export class AsyncLedger {
  private pool: Pool;
  private tableName = 'research_async_ledger';
  private queue: Array<{ tenantId: string, payload: any, resolve: Function }> = [];
  private batchSize = 100;
  private interval = 50; // ms
  private isRunning = false;

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
      CREATE INDEX IF NOT EXISTS idx_async_tenant_seq ON ${this.tableName} (tenant_id, sequence_number DESC);
    `);
    this.startWorker();
  }

  async append(tenantId: string, payload: any): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ tenantId, payload, resolve });
    });
  }

  private startWorker() {
    this.isRunning = true;
    const loop = async () => {
      while (this.isRunning) {
        if (this.queue.length > 0) {
          const batch = this.queue.splice(0, this.batchSize);
          await this.processBatch(batch);
        } else {
          await new Promise(r => setTimeout(r, this.interval));
        }
      }
    };
    loop();
  }

  async stop() {
    this.isRunning = false;
    // Process remaining
    if (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.queue.length);
        await this.processBatch(batch);
    }
  }

  private async processBatch(batch: Array<{ tenantId: string, payload: any, resolve: Function }>) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Group by tenant
      const byTenant: Record<string, typeof batch> = {};
      batch.forEach(item => {
        if (!byTenant[item.tenantId]) byTenant[item.tenantId] = [];
        byTenant[item.tenantId].push(item);
      });

      for (const tid of Object.keys(byTenant)) {
        const items = byTenant[tid];

        const last = await client.query(
          `SELECT sequence_number, current_hash FROM ${this.tableName} WHERE tenant_id = $1 ORDER BY sequence_number DESC LIMIT 1 FOR UPDATE`,
          [tid]
        );

        let seq = 1n;
        let prevHash = '0'.repeat(64);

        if (last.rows.length > 0) {
          seq = BigInt(last.rows[0].sequence_number) + 1n;
          prevHash = last.rows[0].current_hash;
        }

        for (const item of items) {
            const currentHash = crypto.createHash('sha256').update(prevHash + JSON.stringify(item.payload)).digest('hex');

            await client.query(
                `INSERT INTO ${this.tableName} (tenant_id, sequence_number, previous_hash, current_hash, payload) VALUES ($1, $2, $3, $4, $5)`,
                [tid, seq.toString(), prevHash, currentHash, JSON.stringify(item.payload)]
            );

            prevHash = currentHash;
            seq++;
            item.resolve();
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      // In real world, we'd need DLQ logic here
    } finally {
      client.release();
    }
  }
}
