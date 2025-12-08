CREATE TABLE IF NOT EXISTS investigation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_by_principal_id TEXT NOT NULL,
  graph_state JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_investigation_sessions_tenant_id ON investigation_sessions(tenant_id);
CREATE INDEX idx_investigation_sessions_created_by ON investigation_sessions(created_by_principal_id);
