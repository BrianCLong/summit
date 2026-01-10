-- Memory Blocks persistence for context management
CREATE TABLE IF NOT EXISTS memory_blocks (
  block_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  size_limit INTEGER NOT NULL,
  description TEXT,
  is_read_only BOOLEAN NOT NULL DEFAULT FALSE,
  scope TEXT NOT NULL DEFAULT 'LOCAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_blocks_owner ON memory_blocks (tenant_id, owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_memory_blocks_label ON memory_blocks (tenant_id, label);
CREATE INDEX IF NOT EXISTS idx_memory_blocks_scope ON memory_blocks (tenant_id, scope);

CREATE TABLE IF NOT EXISTS memory_block_shares (
  id BIGSERIAL PRIMARY KEY,
  block_id UUID NOT NULL REFERENCES memory_blocks(block_id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT 'read',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (block_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_block_shares_block ON memory_block_shares (block_id);
CREATE INDEX IF NOT EXISTS idx_memory_block_shares_agent ON memory_block_shares (agent_id);

CREATE TABLE IF NOT EXISTS memory_block_revisions (
  id BIGSERIAL PRIMARY KEY,
  block_id UUID NOT NULL REFERENCES memory_blocks(block_id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  updated_by TEXT,
  updated_by_type TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_block_revisions_block ON memory_block_revisions (block_id, created_at DESC);
