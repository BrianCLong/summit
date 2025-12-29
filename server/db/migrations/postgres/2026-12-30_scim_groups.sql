
-- SCIM Groups and Group Members
-- 2026-12-30_scim_groups.sql

CREATE TABLE IF NOT EXISTS scim_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    display_name TEXT NOT NULL,
    external_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,

    CONSTRAINT scim_groups_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scim_groups_tenant_name ON scim_groups (tenant_id, display_name);

CREATE TABLE IF NOT EXISTS scim_group_members (
    group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (group_id, user_id),
    CONSTRAINT scim_group_members_group_fk FOREIGN KEY (group_id) REFERENCES scim_groups(id) ON DELETE CASCADE,
    CONSTRAINT scim_group_members_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for looking up groups by user
CREATE INDEX IF NOT EXISTS idx_scim_group_members_user ON scim_group_members (user_id);
