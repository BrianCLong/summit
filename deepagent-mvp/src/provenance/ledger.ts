import { Pool } from 'pg';
import { createHash } from 'crypto';
import { config } from '../config';

export class ProvenanceLedger {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(config.postgres);
  }

  public async recordEvent(
    tenantId: string,
    runId: string,
    actor: string,
    type: string,
    payload: any
  ): Promise<void> {
    const lastEvent = await this.getLastEvent(tenantId, runId);
    const prevHash = lastEvent ? lastEvent.hash : '';
    const canonicalPayload = JSON.stringify(payload);
    const hash = createHash('sha256')
      .update(prevHash + canonicalPayload)
      .digest('hex');

    const query = 'INSERT INTO provenance_events (tenant_id, run_id, actor, type, payload, prev_hash, hash) VALUES ($1, $2, $3, $4, $5, $6, $7)';
    await this.pool.query(query, [tenantId, runId, actor, type, payload, prevHash, hash]);
  }

  private async getLastEvent(tenantId: string, runId: string): Promise<any | null> {
    const query = 'SELECT * FROM provenance_events WHERE tenant_id = $1 AND run_id = $2 ORDER BY ts DESC LIMIT 1';
    const result = await this.pool.query(query, [tenantId, runId]);
    return result.rows[0] || null;
  }

  public async getEvents(tenantId: string, runId: string): Promise<any[]> {
    const query = 'SELECT * FROM provenance_events WHERE tenant_id = $1 AND run_id = $2 ORDER BY ts ASC';
    const result = await this.pool.query(query, [tenantId, runId]);
    return result.rows;
  }
}
