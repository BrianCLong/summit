/**
 * Database migrations for Model Hub Service
 */

import { db } from './connection.js';
import { logger } from '../utils/logger.js';

const MIGRATIONS = [
  {
    version: 1,
    name: 'create_models_table',
    up: `
      CREATE TABLE IF NOT EXISTS model_hub_models (
        id UUID PRIMARY KEY,
        name VARCHAR(128) NOT NULL UNIQUE,
        display_name VARCHAR(256) NOT NULL,
        description TEXT,
        provider VARCHAR(64) NOT NULL,
        capabilities TEXT[] NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        tags TEXT[] DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(256) NOT NULL,
        updated_by VARCHAR(256) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_models_name ON model_hub_models(name);
      CREATE INDEX IF NOT EXISTS idx_models_provider ON model_hub_models(provider);
      CREATE INDEX IF NOT EXISTS idx_models_status ON model_hub_models(status);
      CREATE INDEX IF NOT EXISTS idx_models_capabilities ON model_hub_models USING GIN(capabilities);
    `,
  },
  {
    version: 2,
    name: 'create_model_versions_table',
    up: `
      CREATE TABLE IF NOT EXISTS model_hub_model_versions (
        id UUID PRIMARY KEY,
        model_id UUID NOT NULL REFERENCES model_hub_models(id) ON DELETE CASCADE,
        version VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        endpoint TEXT,
        endpoint_type VARCHAR(32) DEFAULT 'rest',
        credentials JSONB,
        configuration JSONB DEFAULT '{}',
        resource_requirements JSONB DEFAULT '{}',
        performance_metrics JSONB DEFAULT '{}',
        evaluation_results JSONB DEFAULT '{}',
        changelog TEXT,
        release_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(256) NOT NULL,
        promoted_at TIMESTAMPTZ,
        promoted_by VARCHAR(256),
        UNIQUE(model_id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_model_versions_model_id ON model_hub_model_versions(model_id);
      CREATE INDEX IF NOT EXISTS idx_model_versions_status ON model_hub_model_versions(status);
    `,
  },
  {
    version: 3,
    name: 'create_policy_profiles_table',
    up: `
      CREATE TABLE IF NOT EXISTS model_hub_policy_profiles (
        id UUID PRIMARY KEY,
        name VARCHAR(128) NOT NULL UNIQUE,
        description TEXT,
        rules JSONB NOT NULL,
        data_classifications TEXT[] DEFAULT '{unclassified}',
        compliance_frameworks TEXT[] DEFAULT '{}',
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(256) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_policy_profiles_name ON model_hub_policy_profiles(name);
      CREATE INDEX IF NOT EXISTS idx_policy_profiles_is_active ON model_hub_policy_profiles(is_active);
    `,
  },
  {
    version: 4,
    name: 'create_deployment_configs_table',
    up: `
      CREATE TABLE IF NOT EXISTS model_hub_deployment_configs (
        id UUID PRIMARY KEY,
        model_version_id UUID NOT NULL REFERENCES model_hub_model_versions(id) ON DELETE CASCADE,
        environment VARCHAR(32) NOT NULL,
        mode VARCHAR(32) NOT NULL DEFAULT 'active',
        traffic_percentage DECIMAL(5,2) DEFAULT 0,
        policy_profile_id UUID REFERENCES model_hub_policy_profiles(id),
        scaling JSONB DEFAULT '{}',
        health_check JSONB DEFAULT '{}',
        circuit_breaker JSONB DEFAULT '{}',
        rollout_strategy JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT false,
        activated_at TIMESTAMPTZ,
        activated_by VARCHAR(256),
        deactivated_at TIMESTAMPTZ,
        deactivated_by VARCHAR(256),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(256) NOT NULL,
        UNIQUE(model_version_id, environment)
      );
      CREATE INDEX IF NOT EXISTS idx_deployment_configs_model_version ON model_hub_deployment_configs(model_version_id);
      CREATE INDEX IF NOT EXISTS idx_deployment_configs_environment ON model_hub_deployment_configs(environment);
      CREATE INDEX IF NOT EXISTS idx_deployment_configs_is_active ON model_hub_deployment_configs(is_active);
    `,
  },
  {
    version: 5,
    name: 'create_routing_rules_table',
    up: `
      CREATE TABLE IF NOT EXISTS model_hub_routing_rules (
        id UUID PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        description TEXT,
        priority INTEGER DEFAULT 1000,
        conditions JSONB NOT NULL,
        condition_logic VARCHAR(8) DEFAULT 'all',
        target_model_version_id UUID NOT NULL REFERENCES model_hub_model_versions(id),
        fallback_model_version_id UUID REFERENCES model_hub_model_versions(id),
        is_enabled BOOLEAN DEFAULT true,
        valid_from TIMESTAMPTZ,
        valid_until TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(256) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_routing_rules_priority ON model_hub_routing_rules(priority);
      CREATE INDEX IF NOT EXISTS idx_routing_rules_is_enabled ON model_hub_routing_rules(is_enabled);
      CREATE INDEX IF NOT EXISTS idx_routing_rules_target ON model_hub_routing_rules(target_model_version_id);
    `,
  },
  {
    version: 6,
    name: 'create_tenant_bindings_table',
    up: `
      CREATE TABLE IF NOT EXISTS model_hub_tenant_bindings (
        id UUID PRIMARY KEY,
        tenant_id VARCHAR(256) NOT NULL,
        capability VARCHAR(64) NOT NULL,
        model_version_id UUID NOT NULL REFERENCES model_hub_model_versions(id),
        policy_profile_id UUID REFERENCES model_hub_policy_profiles(id),
        is_enabled BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(256) NOT NULL,
        UNIQUE(tenant_id, capability, model_version_id)
      );
      CREATE INDEX IF NOT EXISTS idx_tenant_bindings_tenant ON model_hub_tenant_bindings(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_bindings_capability ON model_hub_tenant_bindings(capability);
      CREATE INDEX IF NOT EXISTS idx_tenant_bindings_is_enabled ON model_hub_tenant_bindings(is_enabled);
    `,
  },
  {
    version: 7,
    name: 'create_model_approvals_table',
    up: `
      CREATE TABLE IF NOT EXISTS model_hub_model_approvals (
        id UUID PRIMARY KEY,
        model_version_id UUID NOT NULL REFERENCES model_hub_model_versions(id) ON DELETE CASCADE,
        environment VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        requested_by VARCHAR(256) NOT NULL,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_by VARCHAR(256),
        reviewed_at TIMESTAMPTZ,
        approval_notes TEXT,
        rejection_reason TEXT,
        evaluation_requirements TEXT[] DEFAULT '{}',
        evaluation_results JSONB DEFAULT '{}',
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(model_version_id, environment)
      );
      CREATE INDEX IF NOT EXISTS idx_approvals_model_version ON model_hub_model_approvals(model_version_id);
      CREATE INDEX IF NOT EXISTS idx_approvals_status ON model_hub_model_approvals(status);
      CREATE INDEX IF NOT EXISTS idx_approvals_environment ON model_hub_model_approvals(environment);
    `,
  },
  {
    version: 8,
    name: 'create_audit_events_table',
    up: `
      CREATE TABLE IF NOT EXISTS model_hub_audit_events (
        id UUID PRIMARY KEY,
        event_type VARCHAR(64) NOT NULL,
        entity_type VARCHAR(32) NOT NULL,
        entity_id UUID NOT NULL,
        actor_id VARCHAR(256) NOT NULL,
        actor_type VARCHAR(32) NOT NULL,
        tenant_id VARCHAR(256),
        changes JSONB,
        metadata JSONB DEFAULT '{}',
        ip_address VARCHAR(64),
        user_agent TEXT,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON model_hub_audit_events(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON model_hub_audit_events(actor_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON model_hub_audit_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON model_hub_audit_events(event_type);
    `,
  },
  {
    version: 9,
    name: 'create_evaluation_runs_table',
    up: `
      CREATE TABLE IF NOT EXISTS model_hub_evaluation_runs (
        id UUID PRIMARY KEY,
        model_version_id UUID NOT NULL REFERENCES model_hub_model_versions(id) ON DELETE CASCADE,
        evaluation_suite_id VARCHAR(256) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        results JSONB DEFAULT '{}',
        error_message TEXT,
        triggered_by VARCHAR(256) NOT NULL,
        trigger_type VARCHAR(32) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_evaluation_runs_model_version ON model_hub_evaluation_runs(model_version_id);
      CREATE INDEX IF NOT EXISTS idx_evaluation_runs_status ON model_hub_evaluation_runs(status);
      CREATE INDEX IF NOT EXISTS idx_evaluation_runs_suite ON model_hub_evaluation_runs(evaluation_suite_id);
    `,
  },
  {
    version: 10,
    name: 'create_migrations_table',
    up: `
      CREATE TABLE IF NOT EXISTS model_hub_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(256) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
];

export async function runMigrations(): Promise<void> {
  logger.info('Running database migrations...');

  // Ensure migrations table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS model_hub_migrations (
      version INTEGER PRIMARY KEY,
      name VARCHAR(256) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get applied migrations
  const appliedResult = await db.query<{ version: number }>(
    'SELECT version FROM model_hub_migrations ORDER BY version',
  );
  const appliedVersions = new Set(appliedResult.rows.map((r) => r.version));

  // Apply pending migrations
  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    logger.info({ message: `Applying migration ${migration.version}: ${migration.name}` });

    await db.transaction(async (client) => {
      await client.query(migration.up);
      await client.query(
        'INSERT INTO model_hub_migrations (version, name) VALUES ($1, $2)',
        [migration.version, migration.name],
      );
    });

    logger.info({ message: `Migration ${migration.version} applied successfully` });
  }

  logger.info('All migrations applied');
}

export async function getMigrationStatus(): Promise<{
  applied: number[];
  pending: number[];
}> {
  const appliedResult = await db.query<{ version: number }>(
    'SELECT version FROM model_hub_migrations ORDER BY version',
  );
  const appliedVersions = appliedResult.rows.map((r) => r.version);
  const allVersions = MIGRATIONS.map((m) => m.version);
  const pendingVersions = allVersions.filter((v) => !appliedVersions.includes(v));

  return {
    applied: appliedVersions,
    pending: pendingVersions,
  };
}
