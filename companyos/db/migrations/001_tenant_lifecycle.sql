-- CompanyOS Tenant Lifecycle Migration
-- Implements A1: Tenant Lifecycle Management (Activate/Suspend/Delete)
-- Status: PENDING -> ACTIVE -> SUSPENDED -> DELETION_REQUESTED -> DELETED

-- ============================================================================
-- TENANT LIFECYCLE TABLES
-- ============================================================================

-- Create companyos schema if not exists
CREATE SCHEMA IF NOT EXISTS companyos;

-- Tenant status enum type
DO $$ BEGIN
    CREATE TYPE companyos.tenant_status AS ENUM (
        'PENDING',
        'ACTIVE',
        'SUSPENDED',
        'DELETION_REQUESTED',
        'DELETED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tenant tier enum type
DO $$ BEGIN
    CREATE TYPE companyos.tenant_tier AS ENUM (
        'STARTER',
        'BRONZE',
        'SILVER',
        'GOLD',
        'ENTERPRISE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Main tenants table with lifecycle support
CREATE TABLE IF NOT EXISTS companyos.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    status companyos.tenant_status NOT NULL DEFAULT 'PENDING',
    tier companyos.tenant_tier NOT NULL DEFAULT 'STARTER',

    -- Region and residency
    region VARCHAR(50) NOT NULL DEFAULT 'us-east-1',
    residency_class VARCHAR(50) DEFAULT 'standard',
    allowed_regions TEXT[] DEFAULT ARRAY['us-east-1'],

    -- Feature flags and quotas
    features JSONB DEFAULT '{}',
    quotas JSONB DEFAULT '{
        "api_calls_per_hour": 10000,
        "storage_gb": 100,
        "users_max": 50,
        "export_calls_per_day": 10
    }',

    -- Contact information
    primary_contact_email VARCHAR(255),
    primary_contact_name VARCHAR(255),
    billing_email VARCHAR(255),

    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    deletion_requested_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

    -- Created by
    created_by VARCHAR(255) NOT NULL,

    -- Constraints
    CONSTRAINT valid_status_timestamps CHECK (
        (status = 'PENDING' OR activated_at IS NOT NULL) AND
        (status != 'SUSPENDED' OR suspended_at IS NOT NULL) AND
        (status != 'DELETION_REQUESTED' OR deletion_requested_at IS NOT NULL) AND
        (status != 'DELETED' OR deleted_at IS NOT NULL)
    )
);

-- Tenant status transitions (audit trail)
CREATE TABLE IF NOT EXISTS companyos.tenant_status_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companyos.tenants(id),
    from_status companyos.tenant_status,
    to_status companyos.tenant_status NOT NULL,
    reason TEXT,
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',

    -- IP and audit context
    ip_address INET,
    user_agent TEXT,
    correlation_id UUID
);

-- Tenant admin users (assigned during onboarding)
CREATE TABLE IF NOT EXISTS companyos.tenant_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companyos.tenants(id),
    user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    invited_by VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',

    UNIQUE(tenant_id, email)
);

-- Tenant onboarding checklists
CREATE TABLE IF NOT EXISTS companyos.tenant_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companyos.tenants(id) UNIQUE,

    -- Checklist steps
    step_metadata_complete BOOLEAN DEFAULT FALSE,
    step_admin_assigned BOOLEAN DEFAULT FALSE,
    step_features_configured BOOLEAN DEFAULT FALSE,
    step_quotas_set BOOLEAN DEFAULT FALSE,
    step_welcome_sent BOOLEAN DEFAULT FALSE,
    step_verified BOOLEAN DEFAULT FALSE,

    -- Timestamps for each step
    metadata_completed_at TIMESTAMPTZ,
    admin_assigned_at TIMESTAMPTZ,
    features_configured_at TIMESTAMPTZ,
    quotas_set_at TIMESTAMPTZ,
    welcome_sent_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,

    -- Overall
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completed_by VARCHAR(255),

    -- Onboarding bundle (reproducible config)
    onboarding_bundle JSONB DEFAULT '{}'
);

-- ============================================================================
-- AUDIT EVENTS TABLE (for A3: Audit Log Viewer)
-- ============================================================================

CREATE TABLE IF NOT EXISTS companyos.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event identification
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    event_action VARCHAR(50) NOT NULL,

    -- Actor information
    actor_id VARCHAR(255),
    actor_email VARCHAR(255),
    actor_type VARCHAR(50) DEFAULT 'user',
    actor_roles TEXT[],

    -- Tenant context
    tenant_id UUID REFERENCES companyos.tenants(id),

    -- Resource information
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    resource_name VARCHAR(255),

    -- Event details
    description TEXT,
    details JSONB DEFAULT '{}',

    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id UUID,
    correlation_id UUID,

    -- Outcome
    outcome VARCHAR(20) DEFAULT 'success',
    error_message TEXT,

    -- Timestamps
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Retention
    retention_days INTEGER DEFAULT 365,

    -- Indexing for fast queries
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(event_type, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(resource_name, '')), 'C')
    ) STORED
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tenants indexes
CREATE INDEX IF NOT EXISTS idx_tenants_external_id ON companyos.tenants(external_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON companyos.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_tier ON companyos.tenants(tier);
CREATE INDEX IF NOT EXISTS idx_tenants_region ON companyos.tenants(region);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON companyos.tenants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenants_metadata ON companyos.tenants USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_tenants_tags ON companyos.tenants USING GIN(tags);

-- Status transitions indexes
CREATE INDEX IF NOT EXISTS idx_transitions_tenant_id ON companyos.tenant_status_transitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transitions_performed_at ON companyos.tenant_status_transitions(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_transitions_to_status ON companyos.tenant_status_transitions(to_status);

-- Tenant admins indexes
CREATE INDEX IF NOT EXISTS idx_tenant_admins_tenant_id ON companyos.tenant_admins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_admins_email ON companyos.tenant_admins(email);
CREATE INDEX IF NOT EXISTS idx_tenant_admins_user_id ON companyos.tenant_admins(user_id);

-- Audit events indexes
CREATE INDEX IF NOT EXISTS idx_audit_tenant_id ON companyos.audit_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON companyos.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON companyos.audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_occurred_at ON companyos.audit_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON companyos.audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_category ON companyos.audit_events(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_search ON companyos.audit_events USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_audit_details ON companyos.audit_events USING GIN(details);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION companyos.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenants_updated_at
    BEFORE UPDATE ON companyos.tenants
    FOR EACH ROW EXECUTE FUNCTION companyos.update_updated_at();

-- Status transition trigger (auto-create audit record)
CREATE OR REPLACE FUNCTION companyos.log_tenant_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO companyos.tenant_status_transitions (
            tenant_id, from_status, to_status, performed_by, reason
        ) VALUES (
            NEW.id, OLD.status, NEW.status,
            COALESCE(current_setting('app.current_user', true), 'system'),
            COALESCE(current_setting('app.status_reason', true), 'Status changed')
        );

        -- Update status timestamps
        CASE NEW.status
            WHEN 'ACTIVE' THEN NEW.activated_at = NOW();
            WHEN 'SUSPENDED' THEN NEW.suspended_at = NOW();
            WHEN 'DELETION_REQUESTED' THEN NEW.deletion_requested_at = NOW();
            WHEN 'DELETED' THEN NEW.deleted_at = NOW();
            ELSE NULL;
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_status_change
    BEFORE UPDATE OF status ON companyos.tenants
    FOR EACH ROW EXECUTE FUNCTION companyos.log_tenant_status_change();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active tenants view
CREATE OR REPLACE VIEW companyos.active_tenants_view AS
SELECT
    t.*,
    COALESCE(
        (SELECT COUNT(*) FROM companyos.tenant_admins ta WHERE ta.tenant_id = t.id AND ta.status = 'ACTIVE'),
        0
    ) as admin_count,
    o.completed_at IS NOT NULL as onboarding_complete
FROM companyos.tenants t
LEFT JOIN companyos.tenant_onboarding o ON o.tenant_id = t.id
WHERE t.status = 'ACTIVE';

-- Tenant lifecycle summary view
CREATE OR REPLACE VIEW companyos.tenant_lifecycle_summary AS
SELECT
    status,
    tier,
    region,
    COUNT(*) as tenant_count,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as created_last_30d,
    COUNT(*) FILTER (WHERE activated_at > NOW() - INTERVAL '30 days') as activated_last_30d
FROM companyos.tenants
GROUP BY status, tier, region
ORDER BY tenant_count DESC;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default quota definitions
INSERT INTO companyos.tenants (
    external_id, name, display_name, status, tier, region, created_by
) VALUES (
    'summit-internal',
    'Summit Internal',
    'Summit Platform - Internal Operations',
    'ACTIVE',
    'ENTERPRISE',
    'us-east-1',
    'system'
) ON CONFLICT (external_id) DO NOTHING;

COMMENT ON TABLE companyos.tenants IS 'CompanyOS tenant records with full lifecycle support';
COMMENT ON TABLE companyos.tenant_status_transitions IS 'Audit trail of all tenant status changes';
COMMENT ON TABLE companyos.tenant_admins IS 'Admin users assigned to tenants during onboarding';
COMMENT ON TABLE companyos.tenant_onboarding IS 'Onboarding checklist and bundle for each tenant';
COMMENT ON TABLE companyos.audit_events IS 'Comprehensive audit log for all CompanyOS operations';
