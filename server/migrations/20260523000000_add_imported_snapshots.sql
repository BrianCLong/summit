CREATE TABLE IF NOT EXISTS imported_snapshots (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  bundle_hash TEXT NOT NULL,
  manifest JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  status TEXT NOT NULL,
  storage_path TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_imported_snapshots_tenant ON imported_snapshots(tenant_id);
