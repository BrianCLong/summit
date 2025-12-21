-- Migration: Identity Unification
-- Purpose: Add support for Canonical Identity types (Service Accounts, Integrations) and standardize User schema
-- Date: 2025-12-14

-- Service Accounts Table
CREATE TABLE IF NOT EXISTS service_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id), -- Responsible human
  client_id TEXT NOT NULL UNIQUE,
  client_secret_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'VIEWER',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_accounts_tenant ON service_accounts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_accounts_client_id ON service_accounts (client_id);

-- Integrations Table
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL, -- e.g. 'github', 'slack'
  config JSONB NOT NULL DEFAULT '{}', -- Non-sensitive config
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations (tenant_id);

-- Devices Table (if not already existing, Canonical Device maps here)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  fingerprint TEXT NOT NULL,
  name TEXT,
  type TEXT, -- mobile, desktop
  last_seen_at TIMESTAMPTZ,
  is_trusted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices (user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices (fingerprint);

-- Note: users table already exists. We assume it is the source of truth for 'User' identity.
-- Note: user_sessions table already exists.
