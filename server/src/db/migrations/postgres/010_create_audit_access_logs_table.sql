-- Create audit_access_logs table for immutable reason-for-access audit trails
-- Implements append-only logging with legal basis tracking

CREATE TYPE maestro.legal_basis AS ENUM (
    'investigation',
    'law_enforcement',
    'regulatory_compliance',
    'court_order',
    'national_security',
    'legitimate_interest',
    'consent',
    'contract_performance',
    'vital_interests',
    'public_interest'
);

CREATE TABLE IF NOT EXISTS maestro.audit_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    case_id UUID REFERENCES maestro.cases(id) ON DELETE RESTRICT,
    user_id VARCHAR(255) NOT NULL,

    -- Access details
    action VARCHAR(100) NOT NULL, -- 'view', 'export', 'modify', 'delete', etc.
    resource_type VARCHAR(100), -- 'case', 'document', 'entity', etc.
    resource_id VARCHAR(255),

    -- Reason and legal basis (REQUIRED fields)
    reason TEXT NOT NULL,
    legal_basis maestro.legal_basis NOT NULL,

    -- Warrant/authority tracking (for future use)
    warrant_id VARCHAR(255),
    authority_reference VARCHAR(500),
    approval_chain JSONB DEFAULT '[]', -- Track dual-control approvals

    -- Audit metadata
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    correlation_id VARCHAR(255),

    -- Immutability support
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    hash VARCHAR(64), -- SHA-256 hash for integrity verification
    previous_hash VARCHAR(64), -- Chain to previous log entry for tamper detection

    -- Additional metadata
    metadata JSONB DEFAULT '{}'
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_audit_access_logs_tenant_id ON maestro.audit_access_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_access_logs_case_id ON maestro.audit_access_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_access_logs_user_id ON maestro.audit_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_access_logs_action ON maestro.audit_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_access_logs_legal_basis ON maestro.audit_access_logs(legal_basis);
CREATE INDEX IF NOT EXISTS idx_audit_access_logs_created_at ON maestro.audit_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_access_logs_warrant_id ON maestro.audit_access_logs(warrant_id) WHERE warrant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_access_logs_correlation_id ON maestro.audit_access_logs(correlation_id) WHERE correlation_id IS NOT NULL;

-- Prevent updates and deletes to enforce immutability
CREATE OR REPLACE FUNCTION maestro.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted. Use dual-control redaction procedures instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_log_update
    BEFORE UPDATE ON maestro.audit_access_logs
    FOR EACH ROW EXECUTE FUNCTION maestro.prevent_audit_log_modification();

CREATE TRIGGER prevent_audit_log_delete
    BEFORE DELETE ON maestro.audit_access_logs
    FOR EACH ROW EXECUTE FUNCTION maestro.prevent_audit_log_modification();

-- Create a table for dual-control redaction requests (not deletes!)
CREATE TABLE IF NOT EXISTS maestro.audit_redaction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_log_id UUID NOT NULL REFERENCES maestro.audit_access_logs(id),
    requested_by VARCHAR(255) NOT NULL,
    approved_by VARCHAR(255),
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_audit_redaction_requests_audit_log_id ON maestro.audit_redaction_requests(audit_log_id);
CREATE INDEX IF NOT EXISTS idx_audit_redaction_requests_status ON maestro.audit_redaction_requests(status);

-- Comments for documentation
COMMENT ON TABLE maestro.audit_access_logs IS 'Immutable append-only audit log for tracking all case access with reason-for-access and legal basis';
COMMENT ON COLUMN maestro.audit_access_logs.legal_basis IS 'Required legal justification for accessing the resource';
COMMENT ON COLUMN maestro.audit_access_logs.reason IS 'Required human-readable explanation for the access';
COMMENT ON COLUMN maestro.audit_access_logs.warrant_id IS 'Reference to legal warrant or court order, if applicable';
COMMENT ON COLUMN maestro.audit_access_logs.approval_chain IS 'JSON array tracking dual-control approvals';
COMMENT ON COLUMN maestro.audit_access_logs.hash IS 'SHA-256 hash of the log entry for integrity verification';
COMMENT ON COLUMN maestro.audit_access_logs.previous_hash IS 'Hash of previous log entry to create tamper-evident chain';
COMMENT ON TABLE maestro.audit_redaction_requests IS 'Dual-control redaction requests for audit logs (does not delete, only masks)';
