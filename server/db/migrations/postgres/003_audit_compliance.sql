
-- Audit Events Table
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  level TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_id UUID NOT NULL,
  session_id UUID,
  request_id UUID,
  user_id TEXT,
  tenant_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  resource_path TEXT,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  compliance_relevant BOOLEAN DEFAULT FALSE,
  compliance_frameworks TEXT[] DEFAULT '{}',
  data_classification TEXT,
  hash TEXT,
  signature TEXT,
  previous_event_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_correlation_id ON audit_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_id ON audit_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_level ON audit_events(level);
CREATE INDEX IF NOT EXISTS idx_audit_events_compliance ON audit_events(compliance_relevant) WHERE compliance_relevant = true;

-- Compliance Reports Table
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forensic Analyses Table
CREATE TABLE IF NOT EXISTS forensic_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL,
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lineage Nodes Table
CREATE TABLE IF NOT EXISTS lineage_nodes (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lineage Edges Table
CREATE TABLE IF NOT EXISTS lineage_edges (
  id UUID PRIMARY KEY,
  source_id UUID REFERENCES lineage_nodes(id),
  target_id UUID REFERENCES lineage_nodes(id),
  operation TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_lineage_edges_source ON lineage_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_lineage_edges_target ON lineage_edges(target_id);

-- Merkle Tree Roots for Compaction
CREATE TABLE IF NOT EXISTS audit_merkle_roots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_timestamp TIMESTAMPTZ NOT NULL,
  end_timestamp TIMESTAMPTZ NOT NULL,
  root_hash TEXT NOT NULL,
  event_count INTEGER NOT NULL,
  archive_url TEXT, -- URL to WORM storage
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent updates/deletes on audit_events (Append-Only enforcement via Trigger)
-- Prevent updates on audit_events (Append-Only enforcement via Trigger)
-- Note: DELETE is allowed for data retention policies (handled by application logic)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Updating audit_events is not allowed';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_mod ON audit_events;
CREATE TRIGGER trg_prevent_audit_mod
BEFORE UPDATE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
