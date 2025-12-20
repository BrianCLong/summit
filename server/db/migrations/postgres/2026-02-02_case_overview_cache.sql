-- Materialized cache for case overview metrics
-- Provides SWR-friendly cache entries with hit/miss instrumentation

CREATE TABLE IF NOT EXISTS maestro.case_overview_cache (
  case_id UUID NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  entity_count INTEGER NOT NULL DEFAULT 0,
  task_count INTEGER NOT NULL DEFAULT 0,
  open_task_count INTEGER NOT NULL DEFAULT 0,
  participant_count INTEGER NOT NULL DEFAULT 0,
  transition_count INTEGER NOT NULL DEFAULT 0,
  audit_event_count INTEGER NOT NULL DEFAULT 0,
  top_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_activity_at TIMESTAMPTZ,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_status TEXT NOT NULL DEFAULT 'fresh',
  hit_count INTEGER NOT NULL DEFAULT 0,
  miss_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  last_miss_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (case_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_case_overview_cache_expires ON maestro.case_overview_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_case_overview_cache_tenant ON maestro.case_overview_cache (tenant_id);
CREATE INDEX IF NOT EXISTS idx_case_overview_cache_refresh_status ON maestro.case_overview_cache (refresh_status);

CREATE OR REPLACE FUNCTION maestro.touch_case_overview_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_overview_cache_updated_at ON maestro.case_overview_cache;
CREATE TRIGGER trg_case_overview_cache_updated_at
BEFORE UPDATE ON maestro.case_overview_cache
FOR EACH ROW EXECUTE FUNCTION maestro.touch_case_overview_cache_updated_at();
