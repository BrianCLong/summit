import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
const url = process.env.SHADOW_DB_URL!;
const sqls = fs
  .readdirSync('server/src/migrations')
  .filter((x) => x.endsWith('.sql'))
  .map((f) => fs.readFileSync(path.join('server/src/migrations', f), 'utf8'));
(async () => {
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query('BEGIN');
  for (const s of sqls) await c.query(s);
  const locks = await c.query(
    'SELECT mode,granted FROM pg_locks WHERE NOT granted',
  );
  if (locks.rowCount > 0) {
    console.error('❌ would block locks:', locks.rows);
    process.exit(1);
  }
  await c.query('ROLLBACK');
  await c.end();
  console.log('✅ dry-run OK');
})();
