import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  await pg.query(`
    CREATE TABLE IF NOT EXISTS attested_nodes(
      node_id text PRIMARY KEY,
      provider text NOT NULL,
      measurement text NOT NULL,
      evidence jsonb NOT NULL,
      verified_at timestamptz NOT NULL
    );

    CREATE TABLE IF NOT EXISTS step_keys(
      run_id uuid NOT NULL,
      step_id text NOT NULL,
      dek_wrapped bytea NOT NULL,
      kms_key_arn text NOT NULL,
      created_at timestamptz DEFAULT now(),
      PRIMARY KEY (run_id, step_id)
    );

    CREATE TABLE IF NOT EXISTS dlp_findings(
      id bigserial PRIMARY KEY,
      run_id uuid,
      step_id text,
      digest text,
      kind text NOT NULL,
      snippet text,
      severity text NOT NULL,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS dp_budgets(
      tenant text NOT NULL,
      dataset text NOT NULL,
      month text NOT NULL,
      epsilon_limit numeric NOT NULL,
      epsilon_spent numeric NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant, dataset, month)
    );
  `);
}
