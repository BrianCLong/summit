import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  await pg.query(`
    CREATE TABLE IF NOT EXISTS cost_exporter_watermarks(
      id boolean PRIMARY KEY DEFAULT true,
      last_ts timestamptz NOT NULL DEFAULT '1970-01-01'
    );
    INSERT INTO cost_exporter_watermarks(id) VALUES (true) ON CONFLICT DO NOTHING;
  `);
}
