CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS graph_visualization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  node_type_colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  node_size INTEGER NOT NULL DEFAULT 48,
  edge_color TEXT NOT NULL DEFAULT '#cccccc',
  edge_width INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS graph_visualization_settings_user_tenant_idx
  ON graph_visualization_settings (user_id, tenant_id);
