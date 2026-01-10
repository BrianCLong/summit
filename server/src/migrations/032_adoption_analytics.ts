/**
 * Migration 032: Adoption Analytics System
 *
 * Creates tables for privacy-respecting adoption analytics.
 *
 * SOC 2 Controls: CC6.1, PI1.1 | GDPR Article 5, 25
 */

import { Pool } from 'pg';
import logger from '../utils/logger.js';

export const version = '032';
export const description = 'Adoption analytics with privacy-preserving aggregation';

export async function up(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Adoption events table (anonymized)
    await client.query(`
      CREATE TABLE IF NOT EXISTS adoption_events (
        event_id UUID PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        tenant_hash VARCHAR(64) NOT NULL,
        user_hash VARCHAR(64) NOT NULL,
        feature_id VARCHAR(100) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        session_hash VARCHAR(64) NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}',
        governance_verdict JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_adoption_events_type
        ON adoption_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_adoption_events_feature
        ON adoption_events(feature_id);
      CREATE INDEX IF NOT EXISTS idx_adoption_events_timestamp
        ON adoption_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_adoption_events_tenant_hash
        ON adoption_events(tenant_hash);
      CREATE INDEX IF NOT EXISTS idx_adoption_events_user_hash
        ON adoption_events(user_hash);
    `);

    // Hourly aggregated metrics (for real-time dashboards)
    await client.query(`
      CREATE TABLE IF NOT EXISTS adoption_metrics_hourly (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL,
        hour INTEGER NOT NULL CHECK (hour >= 0 AND hour < 24),
        feature_id VARCHAR(100) NOT NULL,
        event_count INTEGER NOT NULL DEFAULT 0,
        unique_users INTEGER NOT NULL DEFAULT 0,
        error_count INTEGER NOT NULL DEFAULT 0,
        avg_duration_ms INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(date, hour, feature_id)
      );

      CREATE INDEX IF NOT EXISTS idx_adoption_metrics_hourly_date
        ON adoption_metrics_hourly(date);
      CREATE INDEX IF NOT EXISTS idx_adoption_metrics_hourly_feature
        ON adoption_metrics_hourly(feature_id);
    `);

    // Daily aggregated metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS adoption_metrics_daily (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL,
        feature_id VARCHAR(100) NOT NULL,
        dau INTEGER NOT NULL DEFAULT 0,
        total_events INTEGER NOT NULL DEFAULT 0,
        unique_sessions INTEGER NOT NULL DEFAULT 0,
        new_adopters INTEGER NOT NULL DEFAULT 0,
        error_rate DECIMAL(5,4),
        governance_verdict JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(date, feature_id)
      );

      CREATE INDEX IF NOT EXISTS idx_adoption_metrics_daily_date
        ON adoption_metrics_daily(date);
      CREATE INDEX IF NOT EXISTS idx_adoption_metrics_daily_feature
        ON adoption_metrics_daily(feature_id);
    `);

    // User adoption profiles (anonymized)
    await client.query(`
      CREATE TABLE IF NOT EXISTS adoption_user_profiles (
        user_hash VARCHAR(64) PRIMARY KEY,
        tenant_hash VARCHAR(64) NOT NULL,
        first_seen_at TIMESTAMPTZ NOT NULL,
        last_seen_at TIMESTAMPTZ NOT NULL,
        total_sessions INTEGER NOT NULL DEFAULT 0,
        total_events INTEGER NOT NULL DEFAULT 0,
        features_used JSONB NOT NULL DEFAULT '{}',
        adoption_score INTEGER NOT NULL DEFAULT 0 CHECK (adoption_score >= 0 AND adoption_score <= 100),
        cohort VARCHAR(20),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_adoption_profiles_tenant
        ON adoption_user_profiles(tenant_hash);
      CREATE INDEX IF NOT EXISTS idx_adoption_profiles_cohort
        ON adoption_user_profiles(cohort);
      CREATE INDEX IF NOT EXISTS idx_adoption_profiles_score
        ON adoption_user_profiles(adoption_score);
    `);

    // Funnel definitions
    await client.query(`
      CREATE TABLE IF NOT EXISTS adoption_funnels (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        steps JSONB NOT NULL,
        time_window_ms BIGINT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Funnel analysis results (cached)
    await client.query(`
      CREATE TABLE IF NOT EXISTS adoption_funnel_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        funnel_id VARCHAR(100) NOT NULL REFERENCES adoption_funnels(id),
        date DATE NOT NULL,
        total_entries INTEGER NOT NULL DEFAULT 0,
        step_conversions JSONB NOT NULL,
        overall_conversion_rate DECIMAL(5,4),
        avg_time_to_complete_ms BIGINT,
        governance_verdict JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(funnel_id, date)
      );

      CREATE INDEX IF NOT EXISTS idx_funnel_results_funnel
        ON adoption_funnel_results(funnel_id);
      CREATE INDEX IF NOT EXISTS idx_funnel_results_date
        ON adoption_funnel_results(date);
    `);

    // Cohort definitions
    await client.query(`
      CREATE TABLE IF NOT EXISTS adoption_cohorts (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        criteria JSONB NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Cohort analysis results (cached)
    await client.query(`
      CREATE TABLE IF NOT EXISTS adoption_cohort_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cohort_id VARCHAR(100) NOT NULL REFERENCES adoption_cohorts(id),
        analysis_date DATE NOT NULL,
        member_count INTEGER NOT NULL DEFAULT 0,
        retention_curve JSONB NOT NULL,
        feature_adoption JSONB NOT NULL,
        avg_time_to_value_ms BIGINT,
        governance_verdict JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(cohort_id, analysis_date)
      );

      CREATE INDEX IF NOT EXISTS idx_cohort_results_cohort
        ON adoption_cohort_results(cohort_id);
      CREATE INDEX IF NOT EXISTS idx_cohort_results_date
        ON adoption_cohort_results(analysis_date);
    `);

    // Feature definitions
    await client.query(`
      CREATE TABLE IF NOT EXISTS adoption_features (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        tracking_events VARCHAR(50)[] NOT NULL,
        adoption_threshold INTEGER NOT NULL DEFAULT 3,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Analytics consent tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_consent (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        analytics_consent BOOLEAN NOT NULL DEFAULT false,
        consented_at TIMESTAMPTZ,
        consent_source VARCHAR(50) NOT NULL,
        consent_version VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tenant_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_consent_user
        ON analytics_consent(user_id);
    `);

    await client.query('COMMIT');
    logger.info('Migration 032 completed: Adoption analytics system');
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Migration 032 failed', { error });
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
      DROP TABLE IF EXISTS analytics_consent CASCADE;
      DROP TABLE IF EXISTS adoption_features CASCADE;
      DROP TABLE IF EXISTS adoption_cohort_results CASCADE;
      DROP TABLE IF EXISTS adoption_cohorts CASCADE;
      DROP TABLE IF EXISTS adoption_funnel_results CASCADE;
      DROP TABLE IF EXISTS adoption_funnels CASCADE;
      DROP TABLE IF EXISTS adoption_user_profiles CASCADE;
      DROP TABLE IF EXISTS adoption_metrics_daily CASCADE;
      DROP TABLE IF EXISTS adoption_metrics_hourly CASCADE;
      DROP TABLE IF EXISTS adoption_events CASCADE;
    `);

    await client.query('COMMIT');
    logger.info('Migration 032 rolled back: Adoption analytics system');
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Migration 032 rollback failed', { error });
    throw error;
  } finally {
    client.release();
  }
}
