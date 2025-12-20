-- owner: data-platform
-- risk: medium
-- backfill_required: true
-- estimated_runtime: 4m
-- reversible: true
-- flags: dual_write=true, shadow_read=true, cutover_enabled=false

CREATE TABLE IF NOT EXISTS intel_cases_shadow (
  id UUID PRIMARY KEY,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE intel_cases_shadow IS 'Shadow table for dual-write verification during expand phase';
