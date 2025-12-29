-- Migration: ER guardrail evaluations and overrides
-- Date: 2025-12-30
-- Purpose: Track ER guardrail evaluations and override reasons

CREATE TABLE IF NOT EXISTS er_guardrail_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id TEXT NOT NULL,
  precision DECIMAL(6,5) NOT NULL,
  recall DECIMAL(6,5) NOT NULL,
  min_precision DECIMAL(6,5) NOT NULL,
  min_recall DECIMAL(6,5) NOT NULL,
  match_threshold DECIMAL(6,5) NOT NULL,
  total_pairs INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  evaluated_by VARCHAR(255),
  details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_er_guardrail_evaluations_dataset
  ON er_guardrail_evaluations (dataset_id, evaluated_at DESC);

CREATE TABLE IF NOT EXISTS er_guardrail_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  merge_id TEXT,
  actor_id VARCHAR(255),
  tenant_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  context JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_er_guardrail_overrides_dataset
  ON er_guardrail_overrides (dataset_id, created_at DESC);

COMMENT ON TABLE er_guardrail_evaluations IS 'ER guardrail evaluation runs for precision/recall fixtures';
COMMENT ON TABLE er_guardrail_overrides IS 'ER guardrail override events with required reasons';
