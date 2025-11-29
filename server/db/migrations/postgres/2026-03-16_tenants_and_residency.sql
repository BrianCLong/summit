-- Migration: Tenants and Residency
-- Description: Adds tenants table and updates users for multi-tenancy support
-- Date: 2026-03-16

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    residency TEXT NOT NULL CHECK (residency IN ('US', 'EU')),
    tier TEXT NOT NULL DEFAULT 'starter',
    status TEXT NOT NULL DEFAULT 'active',
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Feature flags, security config
    settings JSONB NOT NULL DEFAULT '{}'::jsonb, -- UI settings, customization
    created_by UUID, -- ID of the user who created this tenant
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenants_slug_idx ON tenants(slug);
CREATE INDEX IF NOT EXISTS tenants_residency_idx ON tenants(residency);
CREATE INDEX IF NOT EXISTS tenants_created_by_idx ON tenants(created_by);

-- Add tenant_id to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
        ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        CREATE INDEX users_tenant_id_idx ON users(tenant_id);
    END IF;
END $$;

-- Add tenant_id to audit_events if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_events' AND column_name = 'tenant_id') THEN
        ALTER TABLE audit_events ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        CREATE INDEX audit_events_tenant_id_idx ON audit_events(tenant_id);
    END IF;
END $$;
