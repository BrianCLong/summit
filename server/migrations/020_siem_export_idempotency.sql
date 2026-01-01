-- SIEM Export Idempotency Table
-- Ensures events are not exported multiple times

CREATE TABLE IF NOT EXISTS siem_export_idempotency (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  exported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, event_id)
);

-- Index for fast idempotency checks
CREATE INDEX idx_siem_export_tenant_event ON siem_export_idempotency(tenant_id, event_id);

-- Index for cleanup/maintenance
CREATE INDEX idx_siem_export_exported_at ON siem_export_idempotency(exported_at);

-- TTL cleanup (30 days retention)
CREATE OR REPLACE FUNCTION cleanup_siem_export_idempotency() RETURNS void AS $$
BEGIN
  DELETE FROM siem_export_idempotency
  WHERE exported_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- SIEM Push Configuration Table
CREATE TABLE IF NOT EXISTS siem_push_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL CHECK (mode IN ('webhook', 'batch')),
  endpoint TEXT,
  batch_size INTEGER DEFAULT 100,
  batch_interval_seconds INTEGER DEFAULT 300,
  retry_max_attempts INTEGER DEFAULT 4,
  retry_backoff_ms INTEGER DEFAULT 2000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for tenant lookups
CREATE INDEX idx_siem_push_config_tenant ON siem_push_config(tenant_id);

COMMENT ON TABLE siem_export_idempotency IS 'Tracks exported SIEM events to prevent duplicates';
COMMENT ON TABLE siem_push_config IS 'Per-tenant SIEM push configuration';
