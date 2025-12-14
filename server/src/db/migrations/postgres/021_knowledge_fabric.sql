-- 021_knowledge_fabric.sql
-- Canonical Knowledge Fabric Tables for Summit

-- Entities Table
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    external_refs JSONB DEFAULT '[]'::jsonb, -- Array of {system, id}
    labels TEXT[] DEFAULT '{}',
    properties JSONB DEFAULT '{}'::jsonb,
    source_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_tenant_kind ON entities (tenant_id, kind);
CREATE INDEX IF NOT EXISTS idx_entities_labels ON entities USING GIN (labels);
CREATE INDEX IF NOT EXISTS idx_entities_properties ON entities USING GIN (properties);

-- Edges Table
CREATE TABLE IF NOT EXISTS edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    from_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    to_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    source_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edges_tenant_from ON edges (tenant_id, from_entity_id);
CREATE INDEX IF NOT EXISTS idx_edges_tenant_to ON edges (tenant_id, to_entity_id);
CREATE INDEX IF NOT EXISTS idx_edges_kind ON edges (tenant_id, kind);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    title TEXT,
    mime_type TEXT,
    source JSONB NOT NULL, -- {system, id, uri}
    text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    entity_ids UUID[] DEFAULT '{}', -- Linked entities
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents USING GIN (source);

-- Document Chunks (for RAG)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    token_count INT,
    "offset" INT, -- Renamed to quote offset as it's a keyword
    metadata JSONB DEFAULT '{}'::jsonb,
    entity_ids UUID[] DEFAULT '{}',
    embedding vector(1536), -- Assuming OpenAI text-embedding-3-small or similar
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_tenant_doc ON document_chunks (tenant_id, document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- Pipelines Configuration
CREATE TABLE IF NOT EXISTS ingestion_pipelines (
    key TEXT PRIMARY KEY, -- e.g., "csv-import-123"
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    schedule TEXT,
    source_config JSONB NOT NULL, -- {type, config}
    stages TEXT[] NOT NULL,
    options JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON ingestion_pipelines (tenant_id);

-- Ingestion Runs (History)
CREATE TABLE IF NOT EXISTS ingestion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    pipeline_key TEXT NOT NULL REFERENCES ingestion_pipelines(key),
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'partial')),
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    metrics JSONB DEFAULT '{}'::jsonb,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_tenant_pipeline ON ingestion_runs (tenant_id, pipeline_key);
CREATE INDEX IF NOT EXISTS idx_runs_status ON ingestion_runs (status);

-- Dead Letter Queue (DLQ)
CREATE TABLE IF NOT EXISTS ingestion_dlq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    pipeline_key TEXT NOT NULL REFERENCES ingestion_pipelines(key),
    stage TEXT NOT NULL,
    reason TEXT NOT NULL,
    payload JSONB NOT NULL,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dlq_tenant_pipeline ON ingestion_dlq (tenant_id, pipeline_key);
CREATE INDEX IF NOT EXISTS idx_dlq_unresolved ON ingestion_dlq (tenant_id) WHERE resolved_at IS NULL;
