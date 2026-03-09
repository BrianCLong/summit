-- Migration for persistent Token Attribution Graph (TAG)
-- Stores fine-grained token-level provenance for LLM outputs

CREATE TABLE IF NOT EXISTS maestro.attribution_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id VARCHAR(255) UNIQUE NOT NULL,
  output_text TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]', -- Array of AttributionNode
  sources JSONB NOT NULL DEFAULT '{}', -- Record<string, AttributedSource>
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'SYSTEM'
);

-- Index for fast lookups by output_id
CREATE INDEX IF NOT EXISTS idx_attribution_output_id ON maestro.attribution_graphs(output_id);

-- GIN index for searching outputs by source_id within the nodes JSONB
CREATE INDEX IF NOT EXISTS idx_attribution_nodes_source ON maestro.attribution_graphs USING GIN (nodes);

-- Index for tenant-based isolation
CREATE INDEX IF NOT EXISTS idx_attribution_tenant ON maestro.attribution_graphs(tenant_id);

COMMENT ON TABLE maestro.attribution_graphs IS 'Stores token-level attribution data for AI-generated outputs';
