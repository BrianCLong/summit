-- Digital Twin Platform Schema
-- Migration: 001_create_digital_twins

CREATE TABLE IF NOT EXISTS digital_twins (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'INITIALIZING',
    metadata JSONB NOT NULL,
    current_state_vector JSONB NOT NULL,
    data_bindings JSONB DEFAULT '[]'::JSONB,
    relationships JSONB DEFAULT '[]'::JSONB,
    provenance_chain JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_digital_twins_type ON digital_twins(type);
CREATE INDEX idx_digital_twins_state ON digital_twins(state);
CREATE INDEX idx_digital_twins_updated_at ON digital_twins(updated_at DESC);
CREATE INDEX idx_digital_twins_metadata_tags ON digital_twins USING GIN ((metadata->'tags'));
CREATE INDEX idx_digital_twins_name_search ON digital_twins USING GIN (to_tsvector('english', name));

-- State history table (time-series)
CREATE TABLE IF NOT EXISTS twin_state_history (
    id BIGSERIAL PRIMARY KEY,
    twin_id UUID NOT NULL REFERENCES digital_twins(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confidence FLOAT NOT NULL,
    source VARCHAR(255) NOT NULL,
    properties JSONB NOT NULL,
    derived JSONB
);

CREATE INDEX idx_twin_state_history_twin_id ON twin_state_history(twin_id);
CREATE INDEX idx_twin_state_history_timestamp ON twin_state_history(timestamp DESC);

-- Simulation results table
CREATE TABLE IF NOT EXISTS simulation_results (
    id UUID PRIMARY KEY,
    twin_id UUID NOT NULL REFERENCES digital_twins(id) ON DELETE CASCADE,
    config JSONB NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    outcomes JSONB NOT NULL,
    insights JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simulation_results_twin_id ON simulation_results(twin_id);
CREATE INDEX idx_simulation_results_created_at ON simulation_results(created_at DESC);

-- Audit log for provenance
CREATE TABLE IF NOT EXISTS twin_audit_log (
    id BIGSERIAL PRIMARY KEY,
    twin_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_twin_audit_log_twin_id ON twin_audit_log(twin_id);
CREATE INDEX idx_twin_audit_log_timestamp ON twin_audit_log(timestamp DESC);
