-- Create Toil Entries table
CREATE TABLE IF NOT EXISTS toil_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL, -- interrupt, manual_task, alert
    description TEXT,
    duration_minutes INTEGER DEFAULT 0,
    severity VARCHAR(20) DEFAULT 'medium',
    tenant_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_toil_entries_created_at ON toil_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_toil_entries_tenant_id ON toil_entries(tenant_id);

-- Create Toil Exceptions Registry table
CREATE TABLE IF NOT EXISTS toil_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_name VARCHAR(255) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    justification TEXT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    tenant_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' -- active, expired, resolved
);

CREATE INDEX IF NOT EXISTS idx_toil_exceptions_expiry_date ON toil_exceptions(expiry_date);
CREATE INDEX IF NOT EXISTS idx_toil_exceptions_tenant_id ON toil_exceptions(tenant_id);
