/**
 * Migration 031: Enhanced Onboarding System
 *
 * Creates tables for user onboarding progress, analytics events,
 * and sample content tracking.
 *
 * SOC 2 Controls: CC6.1, CC7.2
 */

import { Pool } from 'pg';
import logger from '../utils/logger.js';

export const version = '031';
export const description = 'Enhanced onboarding system with guided tours and analytics';

export async function up(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Enhanced onboarding progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_progress (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        flow_id VARCHAR(100) NOT NULL,
        persona VARCHAR(50) NOT NULL,
        current_step_id VARCHAR(100) NOT NULL,
        step_progress JSONB NOT NULL DEFAULT '{}',
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        total_time_spent INTEGER NOT NULL DEFAULT 0,
        metrics JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tenant_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_onboarding_progress_tenant
        ON onboarding_progress(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user
        ON onboarding_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_onboarding_progress_flow
        ON onboarding_progress(flow_id);
      CREATE INDEX IF NOT EXISTS idx_onboarding_progress_persona
        ON onboarding_progress(persona);
      CREATE INDEX IF NOT EXISTS idx_onboarding_progress_completed
        ON onboarding_progress(completed_at) WHERE completed_at IS NOT NULL;
    `);

    // Onboarding analytics events (anonymized)
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_analytics_events (
        event_id UUID PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        tenant_hash VARCHAR(64) NOT NULL,
        user_hash VARCHAR(64) NOT NULL,
        flow_id VARCHAR(100) NOT NULL,
        step_id VARCHAR(100),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        properties JSONB NOT NULL DEFAULT '{}',
        governance_verdict JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_onboarding_events_type
        ON onboarding_analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_onboarding_events_timestamp
        ON onboarding_analytics_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_onboarding_events_flow
        ON onboarding_analytics_events(flow_id);

      -- Partition by month for efficient querying and archival
      -- (In production, this would use native partitioning)
    `);

    // Sample content installations
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_sample_installations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sample_id VARCHAR(100) NOT NULL,
        sample_type VARCHAR(50) NOT NULL,
        resource_id UUID NOT NULL,
        installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        uninstalled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_sample_installations_tenant
        ON onboarding_sample_installations(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_sample_installations_user
        ON onboarding_sample_installations(user_id);
      CREATE INDEX IF NOT EXISTS idx_sample_installations_type
        ON onboarding_sample_installations(sample_type);
    `);

    // Contextual help dismissals
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_help_dismissals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        help_id VARCHAR(100) NOT NULL,
        dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tenant_id, user_id, help_id)
      );

      CREATE INDEX IF NOT EXISTS idx_help_dismissals_user
        ON onboarding_help_dismissals(tenant_id, user_id);
    `);

    // Feature discovery tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_feature_discovery (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        feature_id VARCHAR(100) NOT NULL,
        discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        discovery_source VARCHAR(50) NOT NULL,
        UNIQUE(tenant_id, user_id, feature_id)
      );

      CREATE INDEX IF NOT EXISTS idx_feature_discovery_tenant
        ON onboarding_feature_discovery(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_feature_discovery_feature
        ON onboarding_feature_discovery(feature_id);
    `);

    // Aggregated onboarding metrics (for product analytics)
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_metrics_daily (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL,
        flow_id VARCHAR(100) NOT NULL,
        persona VARCHAR(50) NOT NULL,
        flows_started INTEGER NOT NULL DEFAULT 0,
        flows_completed INTEGER NOT NULL DEFAULT 0,
        avg_completion_time_seconds INTEGER,
        step_completion_rates JSONB NOT NULL DEFAULT '{}',
        feature_adoption_rates JSONB NOT NULL DEFAULT '{}',
        friction_points JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(date, flow_id, persona)
      );

      CREATE INDEX IF NOT EXISTS idx_onboarding_metrics_date
        ON onboarding_metrics_daily(date);
      CREATE INDEX IF NOT EXISTS idx_onboarding_metrics_flow
        ON onboarding_metrics_daily(flow_id);
    `);

    await client.query('COMMIT');
    logger.info('Migration 031 completed: Enhanced onboarding system');
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Migration 031 failed', { error });
    throw error;
  } finally {
    client.release();
  }
}

export async function down(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      DROP TABLE IF EXISTS onboarding_metrics_daily CASCADE;
      DROP TABLE IF EXISTS onboarding_feature_discovery CASCADE;
      DROP TABLE IF EXISTS onboarding_help_dismissals CASCADE;
      DROP TABLE IF EXISTS onboarding_sample_installations CASCADE;
      DROP TABLE IF EXISTS onboarding_analytics_events CASCADE;
      DROP TABLE IF EXISTS onboarding_progress CASCADE;
    `);

    await client.query('COMMIT');
    logger.info('Migration 031 rolled back: Enhanced onboarding system');
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Migration 031 rollback failed', { error });
    throw error;
  } finally {
    client.release();
  }
}
