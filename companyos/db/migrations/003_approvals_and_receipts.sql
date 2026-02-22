-- Migration 003: Approvals and Receipts

-- Approvals table
CREATE TABLE IF NOT EXISTS companyos.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companyos.tenants(id),
    request_id UUID NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, DENIED
    requested_by VARCHAR(255) NOT NULL,
    required_roles TEXT[] NOT NULL,
    approver_id VARCHAR(255),
    rationale TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ
);

-- Receipts table
CREATE TABLE IF NOT EXISTS companyos.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companyos.tenants(id),
    action_type VARCHAR(100) NOT NULL,
    action_id UUID NOT NULL, -- Corresponds to the ID of the executed action
    actor_id VARCHAR(255) NOT NULL,
    request_hash TEXT NOT NULL,
    policy_bundle_hash TEXT NOT NULL,
    policy_decision JSONB NOT NULL,
    approvals JSONB DEFAULT '[]', -- Snapshot of approvals involved
    artifacts JSONB DEFAULT '[]', -- List of hashes + URIs
    result VARCHAR(20) NOT NULL, -- SUCCESS, FAILURE, DENIED
    error_code VARCHAR(50),
    cost_tags JSONB DEFAULT '{}',
    signature TEXT NOT NULL, -- Cryptographic signature
    signing_key_id VARCHAR(100) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approvals_tenant_id ON companyos.approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON companyos.approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_request_id ON companyos.approvals(request_id);

CREATE INDEX IF NOT EXISTS idx_receipts_tenant_id ON companyos.receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_actor_id ON companyos.receipts(actor_id);
CREATE INDEX IF NOT EXISTS idx_receipts_action_type ON companyos.receipts(action_type);
CREATE INDEX IF NOT EXISTS idx_receipts_occurred_at ON companyos.receipts(occurred_at DESC);
