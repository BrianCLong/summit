-- ============================================================================
-- Migration: 002_receipt_v1_columns
-- Description: Add receipt schema version and extensible receipt payload fields
-- ============================================================================

ALTER TABLE provenance_receipts
  ADD COLUMN IF NOT EXISTS schema_version TEXT NOT NULL DEFAULT 'switchboard.receipt.v1',
  ADD COLUMN IF NOT EXISTS receipt_data JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_provenance_receipts_schema_version
  ON provenance_receipts(schema_version);

INSERT INTO schema_migrations (version) VALUES ('002_receipt_v1_columns')
ON CONFLICT (version) DO NOTHING;
