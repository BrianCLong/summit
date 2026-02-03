-- Migration: Create shadow_traffic_configs table
-- Task #100: Implement Shadow Traffic Configuration API

CREATE TABLE IF NOT EXISTS shadow_traffic_configs (
    tenant_id VARCHAR(255) PRIMARY KEY,
    target_url TEXT NOT NULL,
    sampling_rate FLOAT NOT NULL DEFAULT 0.0,
    compare_responses BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for tenant lookup (redundant on PK but good practice for clarity)
CREATE INDEX IF NOT EXISTS idx_shadow_traffic_tenant_id ON shadow_traffic_configs(tenant_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_shadow_traffic_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_update_shadow_traffic_updated_at
    BEFORE UPDATE ON shadow_traffic_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_shadow_traffic_updated_at();
