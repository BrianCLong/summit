import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  await pg.query(`
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE EXTENSION IF NOT EXISTS vector;

  CREATE TABLE IF NOT EXISTS trust_contracts(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL, consumer text NOT NULL,
    scope jsonb NOT NULL, residency text NOT NULL,
    expires_at timestamptz NOT NULL, signature text NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uq_trust ON trust_contracts(provider, consumer, signature);

  CREATE TABLE IF NOT EXISTS meters(
    tenant text NOT NULL, ts timestamptz NOT NULL DEFAULT now(),
    cpu_sec numeric, gb_sec numeric, egress_gb numeric,
    dp_epsilon numeric, plugin_calls int
  );
  CREATE INDEX IF NOT EXISTS idx_meters_tenant_ts ON meters(tenant, ts);

  CREATE TABLE IF NOT EXISTS event_subscription(
    id bigserial PRIMARY KEY,
    runbook text NOT NULL,
    kind text NOT NULL,
    conf jsonb NOT NULL,
    active boolean DEFAULT true
  );

  CREATE TABLE IF NOT EXISTS stream_offset(
    id bigserial PRIMARY KEY,
    runbook text NOT NULL,
    source_id bigint NOT NULL,
    partition int NOT NULL,
    offset bigint NOT NULL,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(runbook, source_id, partition)
  );

  CREATE TABLE IF NOT EXISTS run_sandbox(
    run_id uuid PRIMARY KEY,
    namespace text NOT NULL,
    created_at timestamptz DEFAULT now(),
    torn_down_at timestamptz
  );

  CREATE TABLE IF NOT EXISTS data_freshness(
    run_id uuid, step_id text,
    source_ts timestamptz, arrival_ts timestamptz DEFAULT now(),
    age_ms bigint,
    PRIMARY KEY (run_id, step_id)
  );

  CREATE TABLE IF NOT EXISTS model_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL, version text NOT NULL, type text NOT NULL,
    uri text NOT NULL, signature text NOT NULL,
    metrics jsonb NOT NULL, created_by text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(name, version)
  );

  CREATE TABLE IF NOT EXISTS embeddings (
    id bigserial PRIMARY KEY,
    tenant text NOT NULL,
    entity_id text NOT NULL,
    entity_type text NOT NULL,
    version text NOT NULL,
    vec vector(768) NOT NULL,
    meta jsonb,
    updated_at timestamptz DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_embeddings_tenant ON embeddings(tenant);
  CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings(entity_id);

  CREATE TABLE IF NOT EXISTS ai_feedback (
    id bigserial PRIMARY KEY,
    run_id uuid, step_id text,
    subject_id text, suggestion text, decision text,
    reason text, created_by text, created_at timestamptz DEFAULT now()
  );
  `);
}
