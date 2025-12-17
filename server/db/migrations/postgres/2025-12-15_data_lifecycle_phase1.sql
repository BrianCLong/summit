-- Data Lifecycle Hardening Phase 1
-- Adds TTL/expiry metadata to audit and copilot log surfaces to support retention enforcement

-- Ensure audit logs carry an explicit expiry so purge jobs can trim older security events
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;

-- Backfill existing rows with a conservative 180-day window based on the recorded timestamp
UPDATE audit_logs
SET retention_expires_at = COALESCE(retention_expires_at, timestamp + INTERVAL '180 days')
WHERE TRUE;

-- Default future rows to the same retention window and index for fast purging
ALTER TABLE audit_logs
  ALTER COLUMN retention_expires_at SET DEFAULT (NOW() + INTERVAL '180 days');

CREATE INDEX IF NOT EXISTS idx_audit_logs_retention_expires_at
  ON audit_logs(retention_expires_at);

-- Copilot event stream entries include intermediate LLM outputs; attach a short TTL
ALTER TABLE copilot_events
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill existing events with a 30-day expiry anchored on their creation timestamp
UPDATE copilot_events
SET expires_at = COALESCE(expires_at, created_at + INTERVAL '30 days')
WHERE TRUE;

-- Default future events to expire after 30 days and index the column for cleanup scans
ALTER TABLE copilot_events
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '30 days');

CREATE INDEX IF NOT EXISTS idx_copilot_events_expires_at
  ON copilot_events(expires_at);
