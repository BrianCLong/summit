
-- Bitemporal Knowledge Repository
-- Task #109
-- SAFE: Creating new tables is safe.

CREATE TABLE IF NOT EXISTS bitemporal_entities (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  props JSONB NOT NULL DEFAULT '{}',

  -- Valid Time: When the fact was true in reality
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_to TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT '9999-12-31 23:59:59+00',

  -- Transaction Time: When we recorded the fact in the system
  transaction_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  transaction_to TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT '9999-12-31 23:59:59+00',

  provenance_id TEXT,
  created_by TEXT,

  PRIMARY KEY (id, tenant_id, transaction_from, valid_from)
);

-- Index for bitemporal point-in-time queries
CREATE INDEX IF NOT EXISTS idx_bitemporal_entities_as_of ON bitemporal_entities(id, transaction_from, transaction_to, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_bitemporal_entities_tenant ON bitemporal_entities(tenant_id);
