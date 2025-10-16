import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const bsz = 1000;
  while (true) {
    const { rows } = await pool.query(
      'SELECT id FROM orders WHERE new_total_cents IS NULL LIMIT $1',
      [bsz],
    );
    if (!rows.length) break;
    for (const r of rows) {
      await pool.query(
        'UPDATE orders SET new_total_cents = total_cents WHERE id=$1',
        [r.id],
      );
    }
  }
}
run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
