import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function enqueueSync(
  siteId: string,
  kind: 'artifact' | 'provenance' | 'event',
  ref: string,
  payload?: Buffer,
) {
  await pg.query(
    `INSERT INTO sync_outbox(site_id,kind,ref,payload) VALUES ($1,$2,$3,$4)`,
    [siteId, kind, ref, payload || null],
  );
}

export async function pump(siteId: string, send: (m: any) => Promise<boolean>) {
  const { rows } = await pg.query(
    `SELECT * FROM sync_outbox WHERE site_id=$1 AND status='QUEUED' ORDER BY id LIMIT 500`,
    [siteId],
  );
  for (const r of rows) {
    const ok = await send(r);
    if (ok)
      await pg.query(`UPDATE sync_outbox SET status='SENT' WHERE id=$1`, [
        r.id,
      ]);
    else
      await pg.query(`UPDATE sync_outbox SET retries=retries+1 WHERE id=$1`, [
        r.id,
      ]);
  }
}
