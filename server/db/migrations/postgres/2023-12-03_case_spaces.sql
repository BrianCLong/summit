-- Case Spaces, SLA Timers, and Immutable Audit Log
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Case Spaces table to store case metadata
CREATE TABLE IF NOT EXISTS case_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  sla_start_time TIMESTAMPTZ,
  sla_end_time TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS case_spaces_status_idx ON case_spaces(status);
CREATE INDEX IF NOT EXISTS case_spaces_priority_idx ON case_spaces(priority);
CREATE INDEX IF NOT EXISTS case_spaces_created_at_idx ON case_spaces(created_at);

-- Case Space Audit Log for immutable audit trail
CREATE TABLE IF NOT EXISTS case_space_audit_log (
  id BIGSERIAL PRIMARY KEY,
  case_space_id UUID NOT NULL REFERENCES case_spaces(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_space_audit_log_case_space_id_idx ON case_space_audit_log(case_space_id);
CREATE INDEX IF NOT EXISTS case_space_audit_log_actor_id_idx ON case_space_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS case_space_audit_log_timestamp_idx ON case_space_audit_log(timestamp);

-- Function to create an audit log entry
CREATE OR REPLACE FUNCTION log_case_space_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO case_space_audit_log (case_space_id, actor_id, action, details)
  VALUES (NEW.id, current_setting('user.id')::UUID, TG_OP, jsonb_build_object('old', OLD, 'new', NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log changes to case_spaces
CREATE TRIGGER case_space_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON case_spaces
FOR EACH ROW EXECUTE FUNCTION log_case_space_change();
