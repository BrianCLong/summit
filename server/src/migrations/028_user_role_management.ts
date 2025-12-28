/**
 * Migration: User and Role Management Tables
 *
 * Creates tables for:
 * - roles: Custom role definitions with permissions
 * - user_roles: User to role assignments with tenant context
 * - Adds columns to users table for lock status
 *
 * SOC 2 Controls: CC6.1 (Logical Access), CC7.2 (Change Management)
 *
 * @module migrations/028_user_role_management
 */

import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });

  await pg.query(`
    -- ============================================================================
    -- Roles Table: Custom role definitions
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      display_name text NOT NULL,
      description text,
      permissions text[] NOT NULL DEFAULT '{}',
      inherits text[] DEFAULT '{}',
      is_system boolean DEFAULT false,
      scope text DEFAULT 'restricted' CHECK (scope IN ('full', 'restricted', 'readonly')),
      tenant_id text NOT NULL,
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE(name, tenant_id)
    );

    -- Indexes for roles
    CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
    CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);

    -- ============================================================================
    -- User Roles Table: User to role assignments
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS user_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id text NOT NULL,  -- Can be UUID or 'builtin-*' for built-in roles
      role_name text NOT NULL,
      tenant_id text NOT NULL,
      granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
      granted_at timestamptz DEFAULT now(),
      expires_at timestamptz,
      is_active boolean GENERATED ALWAYS AS (expires_at IS NULL OR expires_at > now()) STORED,
      UNIQUE(user_id, role_id, tenant_id)
    );

    -- Indexes for user_roles
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active) WHERE is_active = true;

    -- ============================================================================
    -- Add lock columns to users table if not exists
    -- ============================================================================
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS lock_reason text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id) ON DELETE SET NULL;

    -- Index for locked users
    CREATE INDEX IF NOT EXISTS idx_users_is_locked ON users(is_locked) WHERE is_locked = true;

    -- ============================================================================
    -- Role Assignment Audit Table
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS role_assignment_audits (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id text NOT NULL,
      role_name text NOT NULL,
      tenant_id text NOT NULL,
      action text NOT NULL CHECK (action IN ('assigned', 'revoked', 'expired')),
      actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
      reason text,
      metadata jsonb DEFAULT '{}',
      created_at timestamptz DEFAULT now()
    );

    -- Indexes for audit table
    CREATE INDEX IF NOT EXISTS idx_role_assignment_audits_user ON role_assignment_audits(user_id);
    CREATE INDEX IF NOT EXISTS idx_role_assignment_audits_tenant ON role_assignment_audits(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_role_assignment_audits_created ON role_assignment_audits(created_at);

    -- ============================================================================
    -- Trigger for role assignment audit logging
    -- ============================================================================
    CREATE OR REPLACE FUNCTION log_role_assignment_changes()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO role_assignment_audits (user_id, role_id, role_name, tenant_id, action, actor_id)
        VALUES (NEW.user_id, NEW.role_id, NEW.role_name, NEW.tenant_id, 'assigned', NEW.granted_by);
      ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO role_assignment_audits (user_id, role_id, role_name, tenant_id, action, actor_id)
        VALUES (OLD.user_id, OLD.role_id, OLD.role_name, OLD.tenant_id, 'revoked', NULL);
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_role_assignment_audit ON user_roles;
    CREATE TRIGGER trg_role_assignment_audit
      AFTER INSERT OR DELETE ON user_roles
      FOR EACH ROW EXECUTE FUNCTION log_role_assignment_changes();

    -- ============================================================================
    -- Function to update updated_at on roles
    -- ============================================================================
    CREATE OR REPLACE FUNCTION update_roles_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
    CREATE TRIGGER trg_roles_updated_at
      BEFORE UPDATE ON roles
      FOR EACH ROW EXECUTE FUNCTION update_roles_updated_at();
  `);

  console.log('Migration 028_user_role_management completed successfully');
}
