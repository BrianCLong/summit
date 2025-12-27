-- Migration for Data Contracts (Epic B)
-- Created: 2026-04-06

CREATE TABLE IF NOT EXISTS data_contracts (
    id TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL,
    dataset TEXT NOT NULL,
    requirements JSONB NOT NULL, -- { schemaId, pii, residency }
    action TEXT NOT NULL DEFAULT 'BLOCK', -- ALLOW, BLOCK, REDACT
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_contracts_tenant_dataset ON data_contracts(tenant_id, dataset);
CREATE INDEX IF NOT EXISTS idx_data_contracts_schema ON data_contracts((requirements->>'schemaId'));

-- Seed default contract for testing
INSERT INTO data_contracts (id, tenant_id, dataset, requirements, action)
VALUES ('c-default-1', '00000000-0000-0000-0000-000000000000', 'clickstream', '{"schemaId": "user-clickstream-v1", "pii": true}', 'BLOCK')
ON CONFLICT (id) DO NOTHING;
