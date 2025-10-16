import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  await pg.query(`
    CREATE TABLE IF NOT EXISTS run_manifest(
      run_id uuid PRIMARY KEY,
      manifest jsonb NOT NULL,
      digest text NOT NULL,
      signer text,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS openlineage_events(
      id bigserial PRIMARY KEY,
      run_id uuid,
      step_id text,
      event_time timestamptz NOT NULL,
      event_type text NOT NULL,
      payload jsonb NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ol_run ON openlineage_events(run_id, step_id, event_time);

    CREATE TABLE IF NOT EXISTS backfill_jobs(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant text NOT NULL,
      runbook text NOT NULL,
      window_start timestamptz NOT NULL,
      window_end timestamptz NOT NULL,
      filters jsonb,
      status text NOT NULL DEFAULT 'QUEUED',
      created_by text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  `);
}
