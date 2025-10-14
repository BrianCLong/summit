import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  await pg.query(`
    CREATE TABLE IF NOT EXISTS plugin_registry (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      version text NOT NULL,
      oci_uri text NOT NULL,
      digest text NOT NULL,
      signature text NOT NULL,
      sbom jsonb,
      provenance jsonb,
      capabilities jsonb NOT NULL,
      risk text NOT NULL DEFAULT 'unknown',
      approved boolean NOT NULL DEFAULT false,
      approved_by text,
      approved_at timestamptz,
      created_at timestamptz DEFAULT now(),
      UNIQUE(name, version)
    );

    CREATE TABLE IF NOT EXISTS plugin_vulns (
      id bigserial PRIMARY KEY,
      plugin_id uuid REFERENCES plugin_registry(id) ON DELETE CASCADE,
      cve text NOT NULL,
      severity text NOT NULL,
      pkg text,
      version text,
      fix_version text,
      source text,
      discovered_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS step_cache (
      key text PRIMARY KEY,
      artifact_digests text[] NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  `);
}
