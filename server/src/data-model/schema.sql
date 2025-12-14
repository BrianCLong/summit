-- Entities Table
CREATE TABLE IF NOT EXISTS entities (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  external_refs JSONB DEFAULT '[]',
  labels TEXT[] DEFAULT '{}',
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  source_ids TEXT[] DEFAULT '{}',

  PRIMARY KEY (id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_entities_tenant_kind ON entities (tenant_id, kind);
CREATE INDEX IF NOT EXISTS idx_entities_external_refs ON entities USING GIN (external_refs);

-- Edges Table
CREATE TABLE IF NOT EXISTS edges (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  from_entity_id TEXT NOT NULL,
  to_entity_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  source_ids TEXT[] DEFAULT '{}',

  PRIMARY KEY (id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_edges_tenant_from ON edges (tenant_id, from_entity_id);
CREATE INDEX IF NOT EXISTS idx_edges_tenant_to ON edges (tenant_id, to_entity_id);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  title TEXT,
  mime_type TEXT,
  source JSONB,
  text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  entity_ids TEXT[] DEFAULT '{}',

  PRIMARY KEY (id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_created ON documents (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_entity_ids ON documents USING GIN (entity_ids);

-- Chunks Table (for RAG)
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(1536), -- Assuming OpenAI dimension
  metadata JSONB DEFAULT '{}',
  "offset" INTEGER,

  PRIMARY KEY (id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_chunks_tenant_doc ON chunks (tenant_id, document_id);

-- Pipeline Configs Table
CREATE TABLE IF NOT EXISTS pipeline_configs (
  key TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  schedule TEXT,
  source JSONB NOT NULL,
  stages TEXT[] NOT NULL,
  options JSONB DEFAULT '{}',

  PRIMARY KEY (key, tenant_id)
);

-- DLQ Table
CREATE TABLE IF NOT EXISTS dlq_records (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  pipeline_key TEXT NOT NULL,
  stage TEXT NOT NULL,
  reason TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_dlq_tenant_pipeline ON dlq_records (tenant_id, pipeline_key);
