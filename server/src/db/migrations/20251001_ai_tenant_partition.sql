-- Enforce tenant partitioning for AI job tables
ALTER TABLE IF EXISTS ai_jobs
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default_tenant';

CREATE INDEX IF NOT EXISTS idx_ai_jobs_tenant ON ai_jobs(tenant_id);

ALTER TABLE IF EXISTS ai_insights
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default_tenant';

CREATE INDEX IF NOT EXISTS idx_ai_insights_tenant ON ai_insights(tenant_id);

-- Backfill existing rows to the default tenant scope when unset
UPDATE ai_jobs SET tenant_id = COALESCE(tenant_id, 'default_tenant');
UPDATE ai_insights SET tenant_id = COALESCE(tenant_id, 'default_tenant');
