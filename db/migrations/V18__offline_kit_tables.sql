-- Offline Kit Database Schema
-- Tables for verifiable sync logs, claims, proof-carrying results, and policy simulations

-- Sync Log Entries: Tamper-evident log of sync operations
CREATE TABLE IF NOT EXISTS sync_log_entries (
  entry_id VARCHAR(255) PRIMARY KEY,
  node_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sequence_number BIGINT NOT NULL,
  operation JSONB NOT NULL,
  previous_hash VARCHAR(64) NOT NULL,
  merkle_root VARCHAR(64),
  signature TEXT NOT NULL,
  tsa_timestamp TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (node_id, sequence_number)
);

CREATE INDEX idx_sync_log_entries_node_id ON sync_log_entries(node_id);
CREATE INDEX idx_sync_log_entries_timestamp ON sync_log_entries(timestamp DESC);
CREATE INDEX idx_sync_log_entries_verified ON sync_log_entries(verified);

-- Sync Batches: Batch operations with Merkle tree attestation
CREATE TABLE IF NOT EXISTS sync_batches (
  batch_id VARCHAR(255) PRIMARY KEY,
  node_id VARCHAR(255) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  operation_count INTEGER NOT NULL,
  operations JSONB NOT NULL,
  merkle_root VARCHAR(64) NOT NULL,
  merkle_proofs JSONB NOT NULL,
  batch_signature TEXT NOT NULL,
  tsa_timestamp TEXT,
  verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_batches_node_id ON sync_batches(node_id);
CREATE INDEX idx_sync_batches_start_time ON sync_batches(start_time DESC);

-- Data Claims: Privacy-preserving claims with proofs
CREATE TABLE IF NOT EXISTS data_claims (
  claim_id VARCHAR(255) PRIMARY KEY,
  claim_type VARCHAR(50) NOT NULL,
  subject_id VARCHAR(255) NOT NULL,
  subject_type VARCHAR(100) NOT NULL,
  predicate VARCHAR(255) NOT NULL,
  object_hash VARCHAR(64) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  issuer VARCHAR(255) NOT NULL,
  proof JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  verified BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_claims_subject_id ON data_claims(subject_id);
CREATE INDEX idx_data_claims_subject_type ON data_claims(subject_type);
CREATE INDEX idx_data_claims_claim_type ON data_claims(claim_type);
CREATE INDEX idx_data_claims_issuer ON data_claims(issuer);
CREATE INDEX idx_data_claims_timestamp ON data_claims(timestamp DESC);

-- Proof-Carrying Results: Edge computations with attestations
CREATE TABLE IF NOT EXISTS proof_carrying_results (
  result_id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  node_id VARCHAR(255) NOT NULL,
  computation_type VARCHAR(100) NOT NULL,
  inputs JSONB NOT NULL,
  outputs JSONB NOT NULL,
  proof JSONB NOT NULL,
  attestation JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proof_carrying_results_session_id ON proof_carrying_results(session_id);
CREATE INDEX idx_proof_carrying_results_node_id ON proof_carrying_results(node_id);
CREATE INDEX idx_proof_carrying_results_computation_type ON proof_carrying_results(computation_type);
CREATE INDEX idx_proof_carrying_results_timestamp ON proof_carrying_results(timestamp DESC);

-- Policy Leak Simulations: Leakage detection results
CREATE TABLE IF NOT EXISTS policy_leak_simulations (
  simulation_id VARCHAR(255) PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  source_node_id VARCHAR(255) NOT NULL,
  target_node_id VARCHAR(255) NOT NULL,
  operations_analyzed INTEGER NOT NULL,
  violations JSONB NOT NULL DEFAULT '[]',
  leakage_detected BOOLEAN NOT NULL DEFAULT false,
  risk_score INTEGER NOT NULL DEFAULT 0,
  recommendations JSONB NOT NULL DEFAULT '[]',
  summary JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_leak_simulations_source ON policy_leak_simulations(source_node_id);
CREATE INDEX idx_policy_leak_simulations_target ON policy_leak_simulations(target_node_id);
CREATE INDEX idx_policy_leak_simulations_timestamp ON policy_leak_simulations(timestamp DESC);
CREATE INDEX idx_policy_leak_simulations_leakage ON policy_leak_simulations(leakage_detected);
CREATE INDEX idx_policy_leak_simulations_risk_score ON policy_leak_simulations(risk_score DESC);

-- Comments for documentation
COMMENT ON TABLE sync_log_entries IS 'Verifiable sync log entries with cryptographic signatures';
COMMENT ON TABLE sync_batches IS 'Batch sync operations with Merkle tree proofs';
COMMENT ON TABLE data_claims IS 'Privacy-preserving claims with zero-knowledge proofs';
COMMENT ON TABLE proof_carrying_results IS 'Edge computation results with attestations';
COMMENT ON TABLE policy_leak_simulations IS 'Policy leakage detection simulation results';
