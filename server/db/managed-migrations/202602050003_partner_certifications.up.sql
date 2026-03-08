
-- Ecosystem Partnership Certification
-- Task #105
-- SAFE: Creating indexes on new tables is safe.

CREATE TABLE IF NOT EXISTS partner_certifications (
  partner_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_certifications_status ON partner_certifications(status);
