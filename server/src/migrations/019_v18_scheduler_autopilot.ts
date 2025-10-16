import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  await pg.query(`
    CREATE TABLE IF NOT EXISTS tenant_budgets(
      tenant text PRIMARY KEY,
      month text NOT NULL,
      limit_usd numeric NOT NULL,
      soft_pct numeric NOT NULL DEFAULT 0.8,
      hard_pct numeric NOT NULL DEFAULT 1.0,
      spent_usd numeric NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tenant_tokens(
      tenant text PRIMARY KEY,
      cpu_tokens numeric NOT NULL DEFAULT 0,
      gpu_tokens numeric NOT NULL DEFAULT 0,
      refill_cpu_per_s numeric NOT NULL DEFAULT 1,
      refill_gpu_per_s numeric NOT NULL DEFAULT 0.1,
      updated_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS step_checkpoints(
      run_id uuid NOT NULL,
      step_id text NOT NULL,
      digest text NOT NULL,
      size bigint,
      created_at timestamptz DEFAULT now(),
      PRIMARY KEY (run_id, step_id)
    );

    CREATE TABLE IF NOT EXISTS queue_predictions(
      key text PRIMARY KEY,
      horizon_minutes int NOT NULL,
      forecast jsonb NOT NULL,
      updated_at timestamptz DEFAULT now()
    );
  `);
}
