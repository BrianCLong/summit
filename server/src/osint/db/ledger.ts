import crypto from 'crypto';
import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database';

export class ProvLedgerRepo {
  private pool: Pool;
  constructor(pool?: Pool) { this.pool = pool || getPostgresPool(); }

  private hash(input: any) {
    return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
  }

  async append(docHash: string, step: string, data: any = {}, signer?: string | null) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT this_hash FROM prov_ledger WHERE doc_hash=$1 ORDER BY at DESC LIMIT 1`,
        [docHash]
      );
      const prev_hash = rows[0]?.this_hash || null;
      const at = new Date().toISOString();
      const this_hash = this.hash({ docHash, step, at, data, prev_hash });
      await client.query(
        `INSERT INTO prov_ledger(doc_hash, step, at, data, prev_hash, this_hash, signer)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [docHash, step, at, data || {}, prev_hash, this_hash, signer || null]
      );
      await client.query('COMMIT');
      return { prev_hash, this_hash };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

