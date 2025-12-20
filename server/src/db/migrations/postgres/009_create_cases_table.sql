-- Create cases table for Case Spaces functionality
-- Supports compartmentalization, policy labels, and immutable audit trails

CREATE TABLE IF NOT EXISTS maestro.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'active', 'closed', 'archived')),
    compartment VARCHAR(255), -- e.g., 'TS/SCI', 'SECRET', 'CONFIDENTIAL'
    policy_labels TEXT[] DEFAULT '{}', -- Array of policy/classification labels
    metadata JSONB DEFAULT '{}', -- Extensible metadata for future requirements
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by VARCHAR(255)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_tenant_id ON maestro.cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON maestro.cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_compartment ON maestro.cases(compartment);
CREATE INDEX IF NOT EXISTS idx_cases_policy_labels ON maestro.cases USING GIN(policy_labels);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON maestro.cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_metadata ON maestro.cases USING GIN(metadata);

-- Update trigger for updated_at
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON maestro.cases
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE maestro.cases IS 'Case Spaces for managing investigations with compartmentalization and policy-based access control';
COMMENT ON COLUMN maestro.cases.compartment IS 'Security compartment/classification level for the case';
COMMENT ON COLUMN maestro.cases.policy_labels IS 'Array of policy labels for fine-grained access control';
COMMENT ON COLUMN maestro.cases.metadata IS 'Extensible metadata supporting future warrant/authority binding';
