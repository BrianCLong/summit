import { getPostgresPool } from './server/src/db/postgres.ts';

async function test() {
  const pool = getPostgresPool();
  const res = await pool.query("SELECT 1 as x");
  console.log(res);
}
test().catch(console.error);
