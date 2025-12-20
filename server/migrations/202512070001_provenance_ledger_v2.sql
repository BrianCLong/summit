-- Provenance Ledger V2 Schema
-- Immutable audit trail with hash chaining and Merkle roots

-- Provenance Ledger Table
CREATE TABLE IF NOT EXISTS provenance_ledger_v2 (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sequence_number BIGINT NOT NULL,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  payload JSONB,
  metadata JSONB,
  signature TEXT,
  attestation JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prov_ledger_v2_tenant_seq ON provenance_ledger_v2 (tenant_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_prov_ledger_v2_resource ON provenance_ledger_v2 (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_prov_ledger_v2_action ON provenance_ledger_v2 (action_type);
CREATE INDEX IF NOT EXISTS idx_prov_ledger_v2_timestamp ON provenance_ledger_v2 (timestamp);

-- Roots Table (for periodic anchoring)
CREATE TABLE IF NOT EXISTS provenance_ledger_roots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  root_hash TEXT NOT NULL,
  start_sequence BIGINT NOT NULL,
  end_sequence BIGINT NOT NULL,
  entry_count INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature TEXT NOT NULL,
  cosign_bundle TEXT,
  merkle_proof JSONB
);

CREATE INDEX IF NOT EXISTS idx_prov_roots_tenant ON provenance_ledger_roots (tenant_id);
CREATE INDEX IF NOT EXISTS idx_prov_roots_timestamp ON provenance_ledger_roots (timestamp);
