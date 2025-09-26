-- Workflow Templates schema for custom Argo workflows
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  argo_template JSONB NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_tenant ON workflow_templates (tenant_id, name);
