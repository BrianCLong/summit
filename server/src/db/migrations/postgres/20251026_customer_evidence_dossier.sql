-- Customer Evidence Dossier Tables
-- Created: 2025-10-26

-- Account Dossiers: The root entity for a customer's evidence collection
CREATE TABLE IF NOT EXISTS account_dossiers (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'dispute')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT uniq_dossier_account UNIQUE (tenant_id, account_id)
);

CREATE INDEX idx_account_dossiers_tenant_account ON account_dossiers(tenant_id, account_id);

-- Dossier Assurances: Contractual or policy promises made to the customer
CREATE TABLE IF NOT EXISTS dossier_assurances (
    id UUID PRIMARY KEY,
    dossier_id UUID NOT NULL REFERENCES account_dossiers(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'contract_clause', 'policy_commitment'
    content TEXT NOT NULL,
    source TEXT NOT NULL, -- e.g., 'MSA_2025_v1'
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_dossier_assurances_dossier ON dossier_assurances(dossier_id);

-- Dossier Risks: Identified risks or exceptions for this customer
CREATE TABLE IF NOT EXISTS dossier_risks (
    id UUID PRIMARY KEY,
    dossier_id UUID NOT NULL REFERENCES account_dossiers(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'data_residency', 'legacy_auth'
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('active', 'mitigated', 'accepted')),
    mitigation_plan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_dossier_risks_dossier ON dossier_risks(dossier_id);

-- Dossier Artifacts: Evidence files/links
CREATE TABLE IF NOT EXISTS dossier_artifacts (
    id UUID PRIMARY KEY,
    dossier_id UUID NOT NULL REFERENCES account_dossiers(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'audit_report', 'screenshot', 'email_thread'
    name TEXT NOT NULL,
    uri TEXT NOT NULL, -- Storage location or external link
    hash TEXT NOT NULL, -- SHA256 of the artifact content for integrity
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_dossier_artifacts_dossier ON dossier_artifacts(dossier_id);
