-- CompanyOS Tenant Control Plane - Database Schema
-- Migration: 001_create_tenants
-- Description: Creates the tenants table and related feature flags table

-- Tenants table
CREATE TABLE IF NOT EXISTS companyos_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,

  -- Data residency and compliance
  data_region VARCHAR(50) NOT NULL DEFAULT 'us-east-1',
  classification VARCHAR(50) NOT NULL DEFAULT 'unclassified',

  -- Status and lifecycle
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Configuration
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'suspended', 'archived')),
  CONSTRAINT valid_classification CHECK (classification IN ('unclassified', 'cui', 'secret', 'top-secret')),
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR slug ~ '^[a-z0-9]$')
);

-- Tenant feature flags table
CREATE TABLE IF NOT EXISTS companyos_tenant_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES companyos_tenants(id) ON DELETE CASCADE,
  flag_name VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,

  -- Optional configuration for the flag
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(255),

  -- Ensure unique flag per tenant
  CONSTRAINT unique_tenant_flag UNIQUE (tenant_id, flag_name)
);

-- Tenant audit log table
CREATE TABLE IF NOT EXISTS companyos_tenant_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES companyos_tenants(id) ON DELETE SET NULL,

  -- Event details
  event_type VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,

  -- Actor information
  actor_id VARCHAR(255),
  actor_email VARCHAR(255),
  actor_ip VARCHAR(45),

  -- Change details
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Indexes for audit queries
  CONSTRAINT valid_action CHECK (action IN ('create', 'read', 'update', 'delete', 'enable', 'disable', 'login', 'logout'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON companyos_tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON companyos_tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_data_region ON companyos_tenants(data_region);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON companyos_tenants(created_at);

CREATE INDEX IF NOT EXISTS idx_tenant_features_tenant_id ON companyos_tenant_features(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_features_flag_name ON companyos_tenant_features(flag_name);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_tenant_id ON companyos_tenant_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_event_type ON companyos_tenant_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_actor_id ON companyos_tenant_audit(actor_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_created_at ON companyos_tenant_audit(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_companyos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_tenants_updated_at ON companyos_tenants;
CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON companyos_tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_companyos_updated_at();

DROP TRIGGER IF EXISTS trigger_tenant_features_updated_at ON companyos_tenant_features;
CREATE TRIGGER trigger_tenant_features_updated_at
  BEFORE UPDATE ON companyos_tenant_features
  FOR EACH ROW
  EXECUTE FUNCTION update_companyos_updated_at();

-- Insert default feature flags for reference
COMMENT ON TABLE companyos_tenants IS 'CompanyOS tenant organizations with data residency and feature controls';
COMMENT ON TABLE companyos_tenant_features IS 'Feature flags per tenant for progressive rollouts';
COMMENT ON TABLE companyos_tenant_audit IS 'Audit log for tenant operations (create, update, flag changes)';
