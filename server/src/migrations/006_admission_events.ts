import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  await pg.query(`
    CREATE TABLE IF NOT EXISTS admission_events(
      id bigserial PRIMARY KEY,
      ts timestamptz DEFAULT now(),
      decision text NOT NULL,
      policy text,
      resource text,
      details jsonb
    );
    CREATE INDEX IF NOT EXISTS idx_admission_ts ON admission_events(ts);
    CREATE INDEX IF NOT EXISTS idx_admission_decision ON admission_events(decision);
  `);
}
