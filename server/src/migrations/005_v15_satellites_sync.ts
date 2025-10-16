import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  await pg.query(`
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  CREATE TABLE IF NOT EXISTS sites(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    region text NOT NULL,
    residency text NOT NULL,
    trust_pubkey text NOT NULL,
    bandwidth_class text NOT NULL,
    last_seen timestamptz,
    created_at timestamptz DEFAULT now(),
    UNIQUE(name, region)
  );

  CREATE TABLE IF NOT EXISTS site_snapshots(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid REFERENCES sites(id),
    runbook_ref text NOT NULL,
    digest text NOT NULL,
    signature text NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS cas_objects(
    digest text PRIMARY KEY,
    size bigint NOT NULL,
    storage_uri text NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS sync_outbox(
    id bigserial PRIMARY KEY,
    site_id uuid REFERENCES sites(id),
    kind text NOT NULL,
    ref text NOT NULL,
    payload bytea,
    status text NOT NULL DEFAULT 'QUEUED',
    retries int DEFAULT 0,
    created_at timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS sync_bookmarks(
    site_id uuid PRIMARY KEY REFERENCES sites(id),
    last_ack_id bigint DEFAULT 0
  );
  `);
}
