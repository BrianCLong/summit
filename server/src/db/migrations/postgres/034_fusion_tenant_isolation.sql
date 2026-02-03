-- Migration 034: Fusion Tenant Isolation
-- Adds tenant_id to multimodal fusion tables to enforce strict data isolation.

-- 1. Add tenant_id to media_sources
ALTER TABLE media_sources ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_media_sources_tenant_id ON media_sources(tenant_id);

-- 2. Add tenant_id to multimodal_entities
ALTER TABLE multimodal_entities ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_multimodal_entities_tenant_id ON multimodal_entities(tenant_id);

-- 3. Add tenant_id to cross_modal_matches
ALTER TABLE cross_modal_matches ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cross_modal_matches_tenant_id ON cross_modal_matches(tenant_id);

-- 4. Enable RLS on these tables (following the project's security posture)
ALTER TABLE media_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE multimodal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_modal_matches ENABLE ROW LEVEL SECURITY;

-- 5. Create basic RLS policies
-- Note: These policies assume a 'current_tenant_id' setting is available in the session
-- or depend on the user role. For now, we just enable the system to enforce it.
DO $$ BEGIN
    CREATE POLICY tenant_isolation_policy ON media_sources
    FOR ALL TO authenticated
    USING (tenant_id = (current_setting('app.current_tenant_id'))::uuid);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY tenant_isolation_policy ON multimodal_entities
    FOR ALL TO authenticated
    USING (tenant_id = (current_setting('app.current_tenant_id'))::uuid);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY tenant_isolation_policy ON cross_modal_matches
    FOR ALL TO authenticated
    USING (tenant_id = (current_setting('app.current_tenant_id'))::uuid);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
