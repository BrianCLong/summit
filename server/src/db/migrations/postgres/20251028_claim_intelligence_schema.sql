-- Claims Intelligence Schema Upgrade
-- Aligning with Epic AK: Claim Model v1

-- Add structured fields to claims_registry
ALTER TABLE claims_registry
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS predicate TEXT,
  ADD COLUMN IF NOT EXISTS object TEXT,
  ADD COLUMN IF NOT EXISTS effective_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location JSONB, -- storing as JSONB for flexibility (GeoJSON or simple text)
  ADD COLUMN IF NOT EXISTS extraction_method TEXT;

-- Add granular evidence linking fields to claim_evidence_links
ALTER TABLE claim_evidence_links
  ADD COLUMN IF NOT EXISTS offset_start INTEGER,
  ADD COLUMN IF NOT EXISTS offset_end INTEGER,
  ADD COLUMN IF NOT EXISTS page_number INTEGER,
  ADD COLUMN IF NOT EXISTS bbox JSONB, -- [x, y, w, h]
  ADD COLUMN IF NOT EXISTS segment_text TEXT;

-- Add index for structured search
CREATE INDEX IF NOT EXISTS idx_claims_subject ON claims_registry(subject);
CREATE INDEX IF NOT EXISTS idx_claims_predicate ON claims_registry(predicate);
CREATE INDEX IF NOT EXISTS idx_claims_object ON claims_registry(object);
