import { Pool } from 'pg';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
export async function getCached(key: string) {
  const {
    rows: [r],
  } = await pg.query(`SELECT artifact_digests FROM step_cache WHERE key=$1`, [
    key,
  ]);
  return r?.artifact_digests || null;
}
export async function putCached(key: string, digests: string[]) {
  await pg.query(
    `INSERT INTO step_cache(key,artifact_digests) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING`,
    [key, digests],
  );
}
