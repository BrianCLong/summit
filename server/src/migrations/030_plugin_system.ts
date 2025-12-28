/**
 * Migration: Plugin System Tables
 *
 * Creates tables for:
 * - plugins: Plugin registry
 * - plugin_tenant_config: Per-tenant plugin configuration
 * - plugin_audit_log: Plugin execution audit trail
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Configuration), PI1.1 (Audit)
 *
 * @module migrations/030_plugin_system
 */

import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });

  await pg.query(`
    -- ============================================================================
    -- Plugins Table: Plugin registry
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS plugins (
      id text PRIMARY KEY,
      name text NOT NULL,
      version text NOT NULL,
      description text,
      author text NOT NULL,
      category text NOT NULL CHECK (category IN ('alerting', 'notification', 'integration', 'analytics', 'automation', 'security', 'compliance', 'custom')),
      manifest jsonb NOT NULL,
      status text DEFAULT 'registered' CHECK (status IN ('registered', 'installed', 'enabled', 'disabled', 'error', 'deprecated')),
      installed_by uuid REFERENCES users(id) ON DELETE SET NULL,
      installed_at timestamptz DEFAULT now(),
      enabled_by uuid REFERENCES users(id) ON DELETE SET NULL,
      enabled_at timestamptz,
      last_executed_at timestamptz,
      execution_count integer DEFAULT 0,
      error_count integer DEFAULT 0,
      last_error text,
      updated_at timestamptz DEFAULT now()
    );

    -- Indexes for plugins
    CREATE INDEX IF NOT EXISTS idx_plugins_category ON plugins(category);
    CREATE INDEX IF NOT EXISTS idx_plugins_status ON plugins(status);
    CREATE INDEX IF NOT EXISTS idx_plugins_name ON plugins(name);

    -- ============================================================================
    -- Plugin Tenant Config Table: Per-tenant plugin configuration
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS plugin_tenant_config (
      plugin_id text NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
      tenant_id text NOT NULL,
      enabled boolean DEFAULT false,
      config jsonb DEFAULT '{}',
      permissions jsonb DEFAULT '[]',
      created_at timestamptz DEFAULT now(),
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      updated_at timestamptz DEFAULT now(),
      updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
      PRIMARY KEY (plugin_id, tenant_id)
    );

    -- Indexes for plugin_tenant_config
    CREATE INDEX IF NOT EXISTS idx_plugin_tenant_config_tenant ON plugin_tenant_config(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_plugin_tenant_config_enabled ON plugin_tenant_config(tenant_id, enabled) WHERE enabled = true;

    -- ============================================================================
    -- Plugin Audit Log Table: Plugin execution audit trail
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS plugin_audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plugin_id text REFERENCES plugins(id) ON DELETE SET NULL,
      tenant_id text NOT NULL,
      action text NOT NULL,
      actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
      timestamp timestamptz DEFAULT now(),
      duration integer DEFAULT 0,
      success boolean DEFAULT true,
      input jsonb,
      output jsonb,
      error text,
      governance_verdict text DEFAULT 'ALLOW',
      correlation_id text,
      metadata jsonb DEFAULT '{}'
    );

    -- Indexes for plugin_audit_log
    CREATE INDEX IF NOT EXISTS idx_plugin_audit_plugin ON plugin_audit_log(plugin_id);
    CREATE INDEX IF NOT EXISTS idx_plugin_audit_tenant ON plugin_audit_log(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_plugin_audit_timestamp ON plugin_audit_log(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_plugin_audit_actor ON plugin_audit_log(actor_id);
    CREATE INDEX IF NOT EXISTS idx_plugin_audit_action ON plugin_audit_log(action);

    -- ============================================================================
    -- Plugin Events Table: Event subscriptions
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS plugin_event_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plugin_id text NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
      event_type text NOT NULL,
      handler text NOT NULL,
      priority integer DEFAULT 100,
      filter jsonb,
      enabled boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    );

    -- Indexes for plugin_event_subscriptions
    CREATE INDEX IF NOT EXISTS idx_plugin_events_plugin ON plugin_event_subscriptions(plugin_id);
    CREATE INDEX IF NOT EXISTS idx_plugin_events_type ON plugin_event_subscriptions(event_type);
    CREATE INDEX IF NOT EXISTS idx_plugin_events_enabled ON plugin_event_subscriptions(event_type, enabled) WHERE enabled = true;

    -- ============================================================================
    -- Plugin Governance Policies Table: Plugin-specific governance
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS plugin_governance_policies (
      plugin_id text PRIMARY KEY REFERENCES plugins(id) ON DELETE CASCADE,
      required_approval boolean DEFAULT false,
      max_executions_per_hour integer,
      allowed_actions jsonb DEFAULT '[]',
      denied_actions jsonb DEFAULT '[]',
      data_access_restrictions jsonb DEFAULT '[]',
      audit_level text DEFAULT 'basic' CHECK (audit_level IN ('none', 'basic', 'detailed', 'full')),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      created_by uuid REFERENCES users(id) ON DELETE SET NULL
    );

    -- ============================================================================
    -- Function to update updated_at timestamp
    -- ============================================================================
    CREATE OR REPLACE FUNCTION update_plugin_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Triggers for updated_at
    DROP TRIGGER IF EXISTS trg_plugins_updated_at ON plugins;
    CREATE TRIGGER trg_plugins_updated_at
      BEFORE UPDATE ON plugins
      FOR EACH ROW EXECUTE FUNCTION update_plugin_updated_at();

    DROP TRIGGER IF EXISTS trg_plugin_tenant_config_updated_at ON plugin_tenant_config;
    CREATE TRIGGER trg_plugin_tenant_config_updated_at
      BEFORE UPDATE ON plugin_tenant_config
      FOR EACH ROW EXECUTE FUNCTION update_plugin_updated_at();

    DROP TRIGGER IF EXISTS trg_plugin_governance_updated_at ON plugin_governance_policies;
    CREATE TRIGGER trg_plugin_governance_updated_at
      BEFORE UPDATE ON plugin_governance_policies
      FOR EACH ROW EXECUTE FUNCTION update_plugin_updated_at();
  `);

  console.log('Migration 030_plugin_system completed successfully');
}
