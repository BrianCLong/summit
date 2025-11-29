import { query, transaction } from './postgres.js';
import { logger } from '../utils/logger.js';

const log = logger.child({ module: 'schema' });

/**
 * Database schema initialization for the config service.
 * Creates all necessary tables if they don't exist.
 */
export async function initializeSchema(): Promise<void> {
  log.info('Initializing database schema');

  await transaction(async (client) => {
    // Enable UUID extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Config items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS config_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(255) NOT NULL,
        value JSONB NOT NULL,
        value_type VARCHAR(50) NOT NULL,
        level VARCHAR(50) NOT NULL,
        environment VARCHAR(100),
        tenant_id VARCHAR(100),
        user_id VARCHAR(100),
        description TEXT,
        is_secret BOOLEAN DEFAULT false,
        is_governance_protected BOOLEAN DEFAULT false,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by VARCHAR(255) NOT NULL,
        updated_by VARCHAR(255) NOT NULL,
        UNIQUE(key, level, environment, tenant_id, user_id)
      )
    `);

    // Create indexes for config items
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_config_items_key ON config_items(key)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_config_items_tenant ON config_items(tenant_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_config_items_lookup
        ON config_items(key, tenant_id, environment, user_id)
    `);

    // Segments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS segments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        tenant_id VARCHAR(100),
        rules JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by VARCHAR(255) NOT NULL,
        updated_by VARCHAR(255) NOT NULL,
        UNIQUE(name, tenant_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_segments_tenant ON segments(tenant_id)
    `);

    // Feature flags table
    await client.query(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        tenant_id VARCHAR(100),
        enabled BOOLEAN DEFAULT false,
        default_value JSONB NOT NULL,
        value_type VARCHAR(50) NOT NULL DEFAULT 'boolean',
        allowlist JSONB DEFAULT '[]',
        blocklist JSONB DEFAULT '[]',
        is_governance_protected BOOLEAN DEFAULT false,
        stale_after_days INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by VARCHAR(255) NOT NULL,
        updated_by VARCHAR(255) NOT NULL,
        UNIQUE(key, tenant_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant ON feature_flags(tenant_id)
    `);

    // Feature flag targeting rules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS flag_targeting_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
        segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
        inline_conditions JSONB,
        rollout_percentage DECIMAL(5,2) NOT NULL DEFAULT 100,
        value JSONB NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_flag_targeting_rules_flag
        ON flag_targeting_rules(flag_id)
    `);

    // Experiments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS experiments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        tenant_id VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        target_segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
        rollout_percentage DECIMAL(5,2) NOT NULL DEFAULT 100,
        allowlist JSONB DEFAULT '[]',
        blocklist JSONB DEFAULT '[]',
        is_governance_protected BOOLEAN DEFAULT false,
        requires_approval BOOLEAN DEFAULT false,
        approved_by VARCHAR(255),
        approved_at TIMESTAMP WITH TIME ZONE,
        started_at TIMESTAMP WITH TIME ZONE,
        ended_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by VARCHAR(255) NOT NULL,
        updated_by VARCHAR(255) NOT NULL,
        UNIQUE(key, tenant_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_experiments_key ON experiments(key)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_experiments_tenant ON experiments(tenant_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status)
    `);

    // Experiment variants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS experiment_variants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        weight DECIMAL(5,2) NOT NULL,
        value JSONB NOT NULL,
        is_control BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_experiment_variants_experiment
        ON experiment_variants(experiment_id)
    `);

    // Audit log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS config_audit_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        action VARCHAR(50) NOT NULL,
        previous_value JSONB,
        new_value JSONB,
        tenant_id VARCHAR(100),
        user_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_config_audit_log_entity
        ON config_audit_log(entity_type, entity_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_config_audit_log_tenant
        ON config_audit_log(tenant_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_config_audit_log_timestamp
        ON config_audit_log(timestamp DESC)
    `);

    // Experiment assignments table (for tracking)
    await client.query(`
      CREATE TABLE IF NOT EXISTS experiment_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
        variant_id UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(100),
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(experiment_id, user_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user
        ON experiment_assignments(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_experiment_assignments_experiment
        ON experiment_assignments(experiment_id)
    `);
  });

  log.info('Database schema initialized successfully');
}

/**
 * Checks if the schema has been initialized.
 */
export async function isSchemaInitialized(): Promise<boolean> {
  try {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'config_items'
      )`,
    );
    return result.rows[0]?.exists ?? false;
  } catch {
    return false;
  }
}
