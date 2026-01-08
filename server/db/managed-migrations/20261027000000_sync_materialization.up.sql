
-- sync_journal table
CREATE TABLE IF NOT EXISTS sync_journal (
  id BIGSERIAL PRIMARY KEY,
  op_id UUID UNIQUE NOT NULL,
  tenant_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  payload JSONB,
  vector_clock JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  tags TEXT[], -- Added for selective sync

  -- Indexing for sync/pull
  INDEX idx_sync_journal_tenant_seq (tenant_id, id)
);

-- sync_objects table (materialized view of current state)
CREATE TABLE IF NOT EXISTS sync_objects (
  tenant_id UUID NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,

  payload JSONB NOT NULL,
  payload_hash TEXT NOT NULL,
  vector_clock JSONB NOT NULL,

  is_tombstone BOOLEAN DEFAULT FALSE,
  tombstone_version BIGINT,

  last_modified_actor TEXT,
  last_modified_at TIMESTAMPTZ NOT NULL,

  last_op_id UUID,
  tags TEXT[], -- Added for selective sync

  PRIMARY KEY (tenant_id, object_type, object_id)
);

-- sync_conflicts table
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,

  op_ids UUID[] NOT NULL,
  winning_op_id UUID NOT NULL,
  losing_op_id UUID NOT NULL,

  winning_vector_clock JSONB NOT NULL,
  losing_vector_clock JSONB NOT NULL,

  reason_code TEXT NOT NULL,
  remediation_hint TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_sync_conflicts_tenant (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_objects_type ON sync_objects (tenant_id, object_type);
CREATE INDEX IF NOT EXISTS idx_sync_objects_tags ON sync_objects USING GIN (tags);
