-- OSINT MVP-3: provenance ledger + source scheduler/health

CREATE TABLE IF NOT EXISTS prov_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_hash TEXT NOT NULL,
  step TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  prev_hash TEXT,
  this_hash TEXT NOT NULL,
  signer TEXT
);

CREATE INDEX IF NOT EXISTS idx_prov_ledger_doc ON prov_ledger(doc_hash, at DESC);

-- Extend osint_sources with scheduler + health
ALTER TABLE osint_sources
  ADD COLUMN IF NOT EXISTS cron TEXT DEFAULT '*/15 * * * *',
  ADD COLUMN IF NOT EXISTS last_status TEXT,
  ADD COLUMN IF NOT EXISTS items_ingested BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

