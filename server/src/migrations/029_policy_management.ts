/**
 * Migration: Policy Management Tables
 *
 * Creates tables for:
 * - managed_policies: Policy definitions with versioning
 * - policy_versions: Version history for policies
 * - policy_approval_requests: Approval workflow
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC6.2 (Change Management), CC7.2 (Configuration)
 *
 * @module migrations/029_policy_management
 */

import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });

  await pg.query(`
    -- ============================================================================
    -- Managed Policies Table: Policy definitions with metadata
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS managed_policies (
      id text PRIMARY KEY,
      name text NOT NULL,
      display_name text NOT NULL,
      description text,
      category text NOT NULL CHECK (category IN ('access', 'data', 'export', 'retention', 'compliance', 'operational', 'safety')),
      priority integer DEFAULT 100,
      scope jsonb NOT NULL,
      rules jsonb NOT NULL,
      action text NOT NULL CHECK (action IN ('ALLOW', 'DENY', 'ESCALATE', 'WARN')),
      status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'deprecated', 'archived')),
      version integer DEFAULT 1,
      tenant_id text NOT NULL,
      effective_from timestamptz,
      effective_until timestamptz,
      metadata jsonb,
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
      approved_at timestamptz,
      published_at timestamptz,
      UNIQUE(name, tenant_id)
    );

    -- Indexes for managed_policies
    CREATE INDEX IF NOT EXISTS idx_managed_policies_tenant ON managed_policies(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_managed_policies_status ON managed_policies(status);
    CREATE INDEX IF NOT EXISTS idx_managed_policies_category ON managed_policies(category);
    CREATE INDEX IF NOT EXISTS idx_managed_policies_active ON managed_policies(tenant_id, status) WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_managed_policies_priority ON managed_policies(priority DESC);

    -- ============================================================================
    -- Policy Versions Table: Version history for policies
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS policy_versions (
      id text PRIMARY KEY,
      policy_id text NOT NULL REFERENCES managed_policies(id) ON DELETE CASCADE,
      version integer NOT NULL,
      content jsonb NOT NULL,
      changelog text,
      status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'deprecated')),
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz DEFAULT now(),
      approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
      approved_at timestamptz,
      UNIQUE(policy_id, version)
    );

    -- Indexes for policy_versions
    CREATE INDEX IF NOT EXISTS idx_policy_versions_policy ON policy_versions(policy_id);
    CREATE INDEX IF NOT EXISTS idx_policy_versions_created ON policy_versions(created_at DESC);

    -- ============================================================================
    -- Policy Approval Requests Table: Approval workflow tracking
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS policy_approval_requests (
      id text PRIMARY KEY,
      policy_id text NOT NULL REFERENCES managed_policies(id) ON DELETE CASCADE,
      policy_name text NOT NULL,
      version integer NOT NULL,
      requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
      requested_at timestamptz DEFAULT now(),
      reason text,
      changelog text,
      status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      review_notes text
    );

    -- Indexes for policy_approval_requests
    CREATE INDEX IF NOT EXISTS idx_policy_approvals_status ON policy_approval_requests(status) WHERE status = 'pending';
    CREATE INDEX IF NOT EXISTS idx_policy_approvals_policy ON policy_approval_requests(policy_id);
    CREATE INDEX IF NOT EXISTS idx_policy_approvals_requested ON policy_approval_requests(requested_at DESC);

    -- ============================================================================
    -- Policy Audit Log Table: All policy changes
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS policy_audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      policy_id text REFERENCES managed_policies(id) ON DELETE SET NULL,
      policy_name text NOT NULL,
      action text NOT NULL CHECK (action IN ('created', 'updated', 'submitted', 'approved', 'rejected', 'published', 'deprecated', 'archived', 'rollback')),
      actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
      previous_state jsonb,
      new_state jsonb,
      metadata jsonb DEFAULT '{}',
      tenant_id text NOT NULL,
      created_at timestamptz DEFAULT now()
    );

    -- Indexes for policy_audit_log
    CREATE INDEX IF NOT EXISTS idx_policy_audit_policy ON policy_audit_log(policy_id);
    CREATE INDEX IF NOT EXISTS idx_policy_audit_tenant ON policy_audit_log(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_policy_audit_created ON policy_audit_log(created_at DESC);

    -- ============================================================================
    -- Trigger for policy audit logging
    -- ============================================================================
    CREATE OR REPLACE FUNCTION log_policy_changes()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO policy_audit_log (policy_id, policy_name, action, actor_id, new_state, tenant_id)
        VALUES (NEW.id, NEW.name, 'created', NEW.created_by, row_to_json(NEW), NEW.tenant_id);
      ELSIF TG_OP = 'UPDATE' THEN
        -- Determine action based on status change
        IF OLD.status != NEW.status THEN
          INSERT INTO policy_audit_log (policy_id, policy_name, action, actor_id, previous_state, new_state, tenant_id)
          VALUES (NEW.id, NEW.name,
            CASE
              WHEN NEW.status = 'pending_approval' THEN 'submitted'
              WHEN NEW.status = 'approved' THEN 'approved'
              WHEN NEW.status = 'active' THEN 'published'
              WHEN NEW.status = 'deprecated' THEN 'deprecated'
              WHEN NEW.status = 'archived' THEN 'archived'
              ELSE 'updated'
            END,
            COALESCE(NEW.approved_by, NEW.created_by), row_to_json(OLD), row_to_json(NEW), NEW.tenant_id);
        ELSIF OLD.version != NEW.version THEN
          INSERT INTO policy_audit_log (policy_id, policy_name, action, actor_id, previous_state, new_state, tenant_id)
          VALUES (NEW.id, NEW.name, 'updated', NEW.created_by, row_to_json(OLD), row_to_json(NEW), NEW.tenant_id);
        END IF;
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_policy_audit ON managed_policies;
    CREATE TRIGGER trg_policy_audit
      AFTER INSERT OR UPDATE ON managed_policies
      FOR EACH ROW EXECUTE FUNCTION log_policy_changes();

    -- ============================================================================
    -- Function to update updated_at on managed_policies
    -- ============================================================================
    CREATE OR REPLACE FUNCTION update_managed_policies_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_managed_policies_updated_at ON managed_policies;
    CREATE TRIGGER trg_managed_policies_updated_at
      BEFORE UPDATE ON managed_policies
      FOR EACH ROW EXECUTE FUNCTION update_managed_policies_updated_at();
  `);

  console.log('Migration 029_policy_management completed successfully');
}
