CREATE TABLE IF NOT EXISTS intelgraph_nodes (
  id TEXT NOT NULL, -- UUIDs or hashed IDs from application
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL,
  props JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id) -- Composite PK for multi-tenancy
);

CREATE TABLE IF NOT EXISTS intelgraph_edges (
  id TEXT NOT NULL,
  tenant_id UUID NOT NULL,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  type TEXT NOT NULL,
  props JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id)
);

CREATE INDEX idx_ig_nodes_type ON intelgraph_nodes (tenant_id, type);
CREATE INDEX idx_ig_nodes_props ON intelgraph_nodes USING GIN (props);
CREATE INDEX idx_ig_edges_from ON intelgraph_edges (tenant_id, from_id);
CREATE INDEX idx_ig_edges_to ON intelgraph_edges (tenant_id, to_id);
