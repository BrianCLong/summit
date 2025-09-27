import { Client } from 'pg';
const RETENTION_WINDOW_D = Number(process.env.RETENTION_DAYS ?? 30);
export async function runRetention() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await pg.query('begin');
  await pg.query(`delete from pii_events where created_at < now() - interval '${RETENTION_WINDOW_D} days'`);
  await pg.query(`update users set email = NULL, phone = NULL where rtbf_requested = true`);
  await pg.query('commit');
  await pg.end();
}
if (require.main === module) runRetention().then(() => console.log('retention ok')).catch(e => { console.error(e); process.exit(1); });

