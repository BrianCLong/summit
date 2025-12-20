-- API Keys for Partner Access
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,
    prefix TEXT NOT NULL,
    name TEXT NOT NULL,
    scopes TEXT[] DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_by UUID, -- Can be null if system generated
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Partner Profiles (Optional extension to Tenants)
CREATE TABLE IF NOT EXISTS partner_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    partner_type TEXT NOT NULL, -- 'agency', 'ngo', 'commercial'
    region TEXT,
    contact_email TEXT,
    data_sharing_agreement_signed BOOLEAN DEFAULT false,
    agreement_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_profiles_tenant_id ON partner_profiles(tenant_id);
