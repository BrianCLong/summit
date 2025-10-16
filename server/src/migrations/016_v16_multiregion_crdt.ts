import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  await pg.query(`
    CREATE TABLE IF NOT EXISTS regions(
      id text PRIMARY KEY,
      name text NOT NULL,
      priority int NOT NULL DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS run_ledger(
      seq bigserial PRIMARY KEY,
      region text NOT NULL REFERENCES regions(id),
      site_id uuid,
      run_id uuid NOT NULL,
      event text NOT NULL,
      payload jsonb NOT NULL,
      lamport bigint NOT NULL,
      ts timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_run ON run_ledger(run_id, lamport);

    CREATE TABLE IF NOT EXISTS ledger_watermarks(
      peer text PRIMARY KEY,
      last_seq bigint NOT NULL DEFAULT 0,
      updated_at timestamptz DEFAULT now()
    );
  `);
}
