-- Add retention metadata columns
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS retention_label TEXT NOT NULL DEFAULT 'short-30d',
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tombstoned_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS user_sessions
  ADD COLUMN IF NOT EXISTS retention_label TEXT NOT NULL DEFAULT 'short-30d',
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tombstoned_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS audit_logs
  ADD COLUMN IF NOT EXISTS retention_label TEXT NOT NULL DEFAULT 'short-30d',
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tombstoned_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS previous_hash TEXT,
  ADD COLUMN IF NOT EXISTS signature TEXT;

ALTER TABLE IF EXISTS analysis_results
  ADD COLUMN IF NOT EXISTS retention_label TEXT NOT NULL DEFAULT 'standard-365d',
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tombstoned_at TIMESTAMP WITH TIME ZONE;

UPDATE users SET retention_label = 'short-30d' WHERE retention_label IS NULL;
UPDATE user_sessions SET retention_label = 'short-30d' WHERE retention_label IS NULL;
UPDATE audit_logs SET retention_label = 'short-30d' WHERE retention_label IS NULL;
UPDATE analysis_results SET retention_label = 'standard-365d' WHERE retention_label IS NULL;

-- Retention run audit table
CREATE TABLE IF NOT EXISTS privacy_retention_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  policy_name TEXT NOT NULL,
  action TEXT NOT NULL,
  retention_tier TEXT NOT NULL,
  records_processed INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  details JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_privacy_retention_runs_run_id ON privacy_retention_job_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_privacy_retention_runs_policy ON privacy_retention_job_runs(policy_name);

-- RTBF request tracking
CREATE TABLE IF NOT EXISTS privacy_rtbf_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  tenant TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  requested_by UUID,
  attestation_signature TEXT NOT NULL,
  attestation_issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attestation_payload JSONB DEFAULT '{}'::jsonb,
  authority_verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  audit_reference TEXT,
  result JSONB DEFAULT '{}'::jsonb,
  retention_tier_snapshot TEXT
);
CREATE INDEX IF NOT EXISTS idx_privacy_rtbf_status ON privacy_rtbf_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_rtbf_subject ON privacy_rtbf_requests(subject_id);

-- Tombstones to exclude deleted data from restores
CREATE TABLE IF NOT EXISTS privacy_tombstones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  primary_key_column TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  rtbf_request_id UUID REFERENCES privacy_rtbf_requests(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE (table_name, primary_key_column, record_id)
);
CREATE INDEX IF NOT EXISTS idx_privacy_tombstones_table ON privacy_tombstones(table_name);
CREATE INDEX IF NOT EXISTS idx_privacy_tombstones_record ON privacy_tombstones(record_id);
