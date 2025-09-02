-- Create investigations table for case management
CREATE TABLE IF NOT EXISTS maestro.investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
    props JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_investigations_tenant_id ON maestro.investigations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_investigations_status ON maestro.investigations(status);
CREATE INDEX IF NOT EXISTS idx_investigations_created_at ON maestro.investigations(created_at);
CREATE INDEX IF NOT EXISTS idx_investigations_props ON maestro.investigations USING GIN(props);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION maestro.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_investigations_updated_at BEFORE UPDATE ON maestro.investigations
    FOR EACH ROW EXECUTE FUNCTION maestro.update_updated_at_column();