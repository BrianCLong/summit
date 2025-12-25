-- Add region and missing columns to tenants table for enterprise readiness

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS region VARCHAR(50); -- e.g. 'us-east-1', 'eu-central-1'
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS residency VARCHAR(50); -- e.g. 'US', 'EU'
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'starter';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_region ON tenants(region);
CREATE INDEX IF NOT EXISTS idx_tenants_residency ON tenants(residency);
