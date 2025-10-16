import { Pool } from 'pg';
import { nextLamport } from './lamport';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function append(
  runId: string,
  event: string,
  payload: any,
  siteId?: string,
) {
  const L = nextLamport();
  await pg.query(
    `INSERT INTO run_ledger(region,site_id,run_id,event,payload,lamport)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      process.env.REGION_ID || 'US',
      siteId || null,
      runId,
      event,
      payload || {},
      L,
    ],
  );
}
