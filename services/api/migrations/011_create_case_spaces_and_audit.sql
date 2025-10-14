-- Migration for Case Spaces, Comments, and Immutable Audit Log

-- Create schema for case management if it doesn't exist
CREATE SCHEMA IF NOT EXISTS maestro;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION maestro.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Case Spaces Table
-- Represents a collaborative space for a case or investigation.
CREATE TABLE IF NOT EXISTS maestro.case_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
    sla_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Indexes for case_spaces
CREATE INDEX IF NOT EXISTS idx_case_spaces_tenant_id ON maestro.case_spaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_case_spaces_status ON maestro.case_spaces(status);
CREATE INDEX IF NOT EXISTS idx_case_spaces_created_at ON maestro.case_spaces(created_at);

-- Update trigger for case_spaces updated_at
CREATE TRIGGER update_case_spaces_updated_at BEFORE UPDATE ON maestro.case_spaces
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- 2. Case Space Comments Table
-- Stores comments related to a specific case space.
CREATE TABLE IF NOT EXISTS maestro.case_space_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_space_id UUID NOT NULL REFERENCES maestro.case_spaces(id) ON DELETE CASCADE,
    author_id VARCHAR(255),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for case_space_comments
CREATE INDEX IF NOT EXISTS idx_case_space_comments_case_space_id ON maestro.case_space_comments(case_space_id);

-- 3. Audit Events Table
-- An append-only log for all significant actions.
CREATE TABLE IF NOT EXISTS maestro.audit_events (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(255),
    actor_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    target_resource VARCHAR(255),
    target_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit_events
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_id ON maestro.audit_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id ON maestro.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON maestro.audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_target_resource_target_id ON maestro.audit_events(target_resource, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON maestro.audit_events(created_at);