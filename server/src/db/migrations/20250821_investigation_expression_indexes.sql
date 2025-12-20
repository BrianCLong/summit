-- Investigation-scoped expression indexes to accelerate JSONB lookups
-- Optimizes props->>'investigationId' filters used throughout services

CREATE INDEX IF NOT EXISTS idx_entities_investigation_id_expr
  ON entities (tenant_id, (props->>'investigationId'))
  WHERE props ? 'investigationId';

CREATE INDEX IF NOT EXISTS idx_relationships_investigation_id_expr
  ON relationships (tenant_id, (props->>'investigationId'))
  WHERE props ? 'investigationId';
