import { Pool } from 'pg';
import crypto from 'crypto';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function appendAudit(e: {
  tenantId: string; actorId: string; action: string;
  resourceType: string; resourceId: string; attrs: Record<string, unknown>;
  purpose?: string; // New optional field
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const prev = await client.query(
      'SELECT hash FROM audit_event WHERE tenant_id=$1 ORDER BY id DESC LIMIT 1',
      [e.tenantId]
    );
    const prevHash: Buffer | null = prev.rows[0]?.hash || null;
    const toHash = Buffer.concat([
      Buffer.from(e.tenantId),
      Buffer.from(e.actorId),
      Buffer.from(e.action),
      Buffer.from(e.resourceType),
      Buffer.from(e.resourceId),
      Buffer.from(JSON.stringify(e.attrs)),
      Buffer.from(e.purpose || ''), // Include purpose in hash
      prevHash || Buffer.alloc(0),
    ]);
    const hash = crypto.createHash('sha256').update(toHash).digest();
    await client.query(
      `INSERT INTO audit_event (tenant_id, actor_id, action, resource_t, resource_id, attrs, prev_hash, hash, purpose)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [e.tenantId, e.actorId, e.action, e.resourceType, e.resourceId, e.attrs, prevHash, hash, e.purpose]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK'); throw err;
  } finally { client.release(); }
}
