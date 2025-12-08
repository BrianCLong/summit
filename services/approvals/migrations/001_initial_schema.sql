-- ============================================================================
-- Approvals Service Database Schema
-- Migration: 001_initial_schema
-- Description: Creates the core tables for policy-gated approvals
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Approval Requests Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,

    -- Resource being acted upon
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_data JSONB NOT NULL DEFAULT '{}',

    -- Action requested
    action TEXT NOT NULL,

    -- Requestor information
    requestor_id TEXT NOT NULL,
    requestor_data JSONB NOT NULL DEFAULT '{}',

    -- Current status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),

    -- ABAC attributes for policy evaluation
    attributes JSONB NOT NULL DEFAULT '{}',

    -- Contextual information (source system, pipeline, etc.)
    context JSONB NOT NULL DEFAULT '{}',

    -- Requestor's justification
    justification TEXT,

    -- Policy evaluation result
    policy_evaluation JSONB,

    -- Final provenance receipt ID
    receipt_id TEXT,

    -- Idempotency key for deduplication
    idempotency_key TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_idempotency_key UNIQUE (tenant_id, idempotency_key)
);

-- Indexes for common queries
CREATE INDEX idx_approval_requests_tenant_id ON approval_requests(tenant_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_requestor ON approval_requests(tenant_id, requestor_id);
CREATE INDEX idx_approval_requests_resource ON approval_requests(tenant_id, resource_type, resource_id);
CREATE INDEX idx_approval_requests_action ON approval_requests(tenant_id, action);
CREATE INDEX idx_approval_requests_created_at ON approval_requests(tenant_id, created_at DESC);
CREATE INDEX idx_approval_requests_expires_at ON approval_requests(expires_at) WHERE status = 'pending';

-- ============================================================================
-- Approval Decisions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,

    -- Actor making the decision
    actor_id TEXT NOT NULL,
    actor_data JSONB NOT NULL DEFAULT '{}',

    -- Decision details
    decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject')),
    reason TEXT,
    conditions JSONB NOT NULL DEFAULT '[]',

    -- Provenance receipt for this decision
    receipt_id TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate decisions from same actor
    CONSTRAINT unique_actor_decision UNIQUE (request_id, actor_id)
);

-- Indexes
CREATE INDEX idx_approval_decisions_request_id ON approval_decisions(request_id);
CREATE INDEX idx_approval_decisions_actor ON approval_decisions(tenant_id, actor_id);
CREATE INDEX idx_approval_decisions_created_at ON approval_decisions(created_at DESC);

-- ============================================================================
-- Provenance Receipts Table (local cache for audit)
-- ============================================================================
CREATE TABLE IF NOT EXISTS provenance_receipts (
    id TEXT PRIMARY KEY,
    approval_id UUID REFERENCES approval_requests(id) ON DELETE SET NULL,
    decision_id UUID REFERENCES approval_decisions(id) ON DELETE SET NULL,
    tenant_id TEXT NOT NULL,

    -- Receipt details
    actor_id TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'created', 'approve', 'reject', 'cancelled'

    -- Cryptographic proof
    input_hash TEXT NOT NULL,
    policy_version TEXT,
    signature TEXT NOT NULL,
    key_id TEXT NOT NULL,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_provenance_receipts_approval_id ON provenance_receipts(approval_id);
CREATE INDEX idx_provenance_receipts_tenant ON provenance_receipts(tenant_id);
CREATE INDEX idx_provenance_receipts_actor ON provenance_receipts(tenant_id, actor_id);

-- ============================================================================
-- Audit Log Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    request_id UUID REFERENCES approval_requests(id) ON DELETE SET NULL,

    -- Event details
    event_type TEXT NOT NULL,
    actor_id TEXT,

    -- Event data
    data JSONB NOT NULL DEFAULT '{}',

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX idx_audit_log_tenant ON approval_audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_request ON approval_audit_log(request_id);

-- ============================================================================
-- Policy Profiles Table (for tenant-scoped configuration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS policy_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    -- Profile configuration
    config JSONB NOT NULL DEFAULT '{}',

    -- Whether this is the default profile for the tenant
    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_profile_name UNIQUE (tenant_id, name)
);

-- Ensure only one default profile per tenant
CREATE UNIQUE INDEX idx_policy_profiles_default
    ON policy_profiles(tenant_id)
    WHERE is_default = TRUE;

-- ============================================================================
-- Schema Migrations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Record this migration
INSERT INTO schema_migrations (version) VALUES ('001_initial_schema')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for approval_requests
DROP TRIGGER IF EXISTS trigger_approval_requests_updated_at ON approval_requests;
CREATE TRIGGER trigger_approval_requests_updated_at
    BEFORE UPDATE ON approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for policy_profiles
DROP TRIGGER IF EXISTS trigger_policy_profiles_updated_at ON policy_profiles;
CREATE TRIGGER trigger_policy_profiles_updated_at
    BEFORE UPDATE ON policy_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE approval_requests IS 'Stores approval requests for high-risk operations requiring policy-gated approval';
COMMENT ON TABLE approval_decisions IS 'Individual approval/rejection decisions from approvers';
COMMENT ON TABLE provenance_receipts IS 'Local cache of provenance receipts for audit and verification';
COMMENT ON TABLE approval_audit_log IS 'Audit log of all approval-related events';
COMMENT ON TABLE policy_profiles IS 'Tenant-scoped policy configuration profiles';

COMMENT ON COLUMN approval_requests.attributes IS 'ABAC attributes passed to OPA for policy evaluation';
COMMENT ON COLUMN approval_requests.policy_evaluation IS 'Result of initial policy evaluation (required approvals, allowed roles, etc.)';
COMMENT ON COLUMN approval_requests.idempotency_key IS 'Client-provided key for request deduplication';
COMMENT ON COLUMN approval_decisions.conditions IS 'Conditions attached to an approval (e.g., time window, environment restrictions)';
COMMENT ON COLUMN provenance_receipts.input_hash IS 'SHA-256 hash of the decision input for verification';
