-- Risk Scoring System v1
-- PostgreSQL tables for persisted risk scores and signals

-- Enable required extensions for UUID generation if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Risk Scores: The top-level assessment of an entity's risk at a specific point in time
CREATE TABLE IF NOT EXISTS risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL, -- Person, Organization, etc.
    score FLOAT NOT NULL CHECK (score >= 0 AND score <= 1),
    level VARCHAR(50) NOT NULL, -- Low, Medium, High, Critical
    window VARCHAR(20) NOT NULL, -- '24h', '7d', '30d'
    model_version VARCHAR(50) NOT NULL,
    rationale TEXT, -- Human-readable summary
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_risk_scores_tenant FOREIGN KEY (tenant_id) REFERENCES tenant_config(tenant_id) ON DELETE CASCADE
);

-- Indexes for efficient querying by tenant/entity/level
CREATE INDEX IF NOT EXISTS idx_risk_scores_tenant_entity ON risk_scores(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_level ON risk_scores(tenant_id, level);
CREATE INDEX IF NOT EXISTS idx_risk_scores_created ON risk_scores(created_at DESC);

-- Risk Signals: The contributing factors (features/indicators) that led to the score
CREATE TABLE IF NOT EXISTS risk_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_score_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL, -- Feature name e.g. 'sanction_list_match', 'transaction_velocity'
    source VARCHAR(255), -- Provenance: e.g. 'ofac_list', 'internal_tx_monitor'
    value FLOAT NOT NULL, -- The raw feature value
    weight FLOAT NOT NULL, -- The weight applied by the model
    contribution_score FLOAT NOT NULL, -- The final contribution to the overall score (delta)
    description TEXT, -- Explanation of this signal
    detected_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_risk_signals_score FOREIGN KEY (risk_score_id) REFERENCES risk_scores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_risk_signals_score_id ON risk_signals(risk_score_id);

-- Add comments for documentation
COMMENT ON TABLE risk_scores IS 'Persisted risk assessments for entities';
COMMENT ON TABLE risk_signals IS 'Contributing factors for a risk score';

-- Enable RLS
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_signals ENABLE ROW LEVEL SECURITY;

-- Note: Policies are managed dynamically by the application layer based on app.current_tenant
