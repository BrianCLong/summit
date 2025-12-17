import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });

  await pg.query(`
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS memory_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id text NOT NULL,
      project_id text,
      environment text,
      classification text[] DEFAULT '{}'::text[],
      policy_tags text[] DEFAULT '{}'::text[],
      title text,
      description text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      created_by text,
      agent_id text,
      status text NOT NULL DEFAULT 'active',
      origin_run_id text,
      metadata jsonb DEFAULT '{}'::jsonb
    );

    CREATE TABLE IF NOT EXISTS memory_pages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid NOT NULL REFERENCES memory_sessions(id) ON DELETE CASCADE,
      tenant_id text NOT NULL,
      sequence integer NOT NULL,
      title text,
      raw_content jsonb NOT NULL,
      memo text,
      token_count integer,
      actor_id text,
      actor_type text,
      source text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      tags text[] DEFAULT '{}'::text[],
      classification text[] DEFAULT '{}'::text[],
      policy_tags text[] DEFAULT '{}'::text[],
      origin_run_id text,
      embedding vector(1536),
      metadata jsonb DEFAULT '{}'::jsonb,
      UNIQUE (session_id, sequence)
    );

    CREATE TABLE IF NOT EXISTS memory_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      page_id uuid NOT NULL REFERENCES memory_pages(id) ON DELETE CASCADE,
      session_id uuid NOT NULL REFERENCES memory_sessions(id) ON DELETE CASCADE,
      tenant_id text NOT NULL,
      sequence integer NOT NULL,
      type text NOT NULL,
      actor_id text,
      actor_type text,
      content jsonb,
      created_at timestamptz DEFAULT now(),
      tags text[] DEFAULT '{}'::text[],
      classification text[] DEFAULT '{}'::text[],
      policy_tags text[] DEFAULT '{}'::text[],
      origin_run_id text,
      metadata jsonb DEFAULT '{}'::jsonb,
      UNIQUE (page_id, sequence)
    );

    CREATE INDEX IF NOT EXISTS idx_memory_sessions_tenant_created
      ON memory_sessions (tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_memory_pages_session_sequence
      ON memory_pages (session_id, sequence);
    CREATE INDEX IF NOT EXISTS idx_memory_pages_tenant_created
      ON memory_pages (tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_memory_events_session_sequence
      ON memory_events (session_id, sequence);
    CREATE INDEX IF NOT EXISTS idx_memory_events_page_sequence
      ON memory_events (page_id, sequence);
    CREATE INDEX IF NOT EXISTS idx_memory_pages_embedding
      ON memory_pages USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
  `);

  if (!pool) {
    await pg.end();
  }
}
