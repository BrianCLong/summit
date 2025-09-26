import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  await pg.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS security_scan_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      scan_type TEXT NOT NULL,
      target TEXT,
      status TEXT NOT NULL,
      critical_count INT DEFAULT 0,
      high_count INT DEFAULT 0,
      medium_count INT DEFAULT 0,
      low_count INT DEFAULT 0,
      duration_seconds NUMERIC,
      report_url TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      scanned_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_security_scan_reports_tenant ON security_scan_reports(tenant_id, scanned_at DESC);

    CREATE TABLE IF NOT EXISTS opa_policy_decisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      policy TEXT NOT NULL,
      decision TEXT NOT NULL,
      allow BOOLEAN NOT NULL DEFAULT false,
      reason TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      evaluated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_opa_policy_decisions_tenant ON opa_policy_decisions(tenant_id, evaluated_at DESC);
  `);
}
