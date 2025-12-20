-- Migration: Create schema versioning infrastructure
-- ID: 000_schema_versions
-- Version: 1.0.0
-- Database: postgresql
-- Author: platform-team
-- Created: 2025-11-20
-- Breaking: false
-- Dependencies: none

-- This migration creates the foundational tables for database schema versioning
-- and migration tracking across all databases (PostgreSQL, Neo4j, TimescaleDB)

BEGIN;

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Schema Versions Table
-- ============================================================================
-- Tracks the semantic version of the database schema across different database types
CREATE TABLE IF NOT EXISTS schema_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,                -- Semantic version (e.g., "2.1.0")
    database_type VARCHAR(20) NOT NULL,          -- 'postgresql', 'neo4j', 'timescale'
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by VARCHAR(255) NOT NULL,            -- User/system that applied
    migration_id VARCHAR(255) NOT NULL,          -- Reference to migration file
    checksum VARCHAR(64) NOT NULL,               -- SHA-256 of migration content
    execution_time_ms INTEGER,
    rollback_available BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',                 -- Additional metadata

    CONSTRAINT valid_semver CHECK (version ~ '^\d+\.\d+\.\d+$'),
    CONSTRAINT valid_database_type CHECK (database_type IN ('postgresql', 'neo4j', 'timescale', 'redis'))
);

-- Indexes for schema_versions
CREATE INDEX idx_schema_versions_version ON schema_versions(version);
CREATE INDEX idx_schema_versions_database_type ON schema_versions(database_type);
CREATE INDEX idx_schema_versions_applied_at ON schema_versions(applied_at DESC);
CREATE INDEX idx_schema_versions_migration_id ON schema_versions(migration_id);

-- ============================================================================
-- Migration History Table
-- ============================================================================
-- Detailed tracking of all migrations with rollback information
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) NOT NULL,
    migration_id VARCHAR(255) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'completed',
    rollback_sql TEXT,
    metadata JSONB DEFAULT '{}',
    phase VARCHAR(20),                           -- 'expand', 'migrate', 'contract'

    CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back'))
);

-- Indexes for migration_history
CREATE INDEX idx_migration_history_migration_id ON migration_history(migration_id);
CREATE INDEX idx_migration_history_status ON migration_history(status);
CREATE INDEX idx_migration_history_executed_at ON migration_history(executed_at DESC);
CREATE UNIQUE INDEX idx_migration_history_file_checksum ON migration_history(migration_file, checksum);

-- ============================================================================
-- Migration Locks Table
-- ============================================================================
-- Distributed locking to prevent concurrent migrations
CREATE TABLE IF NOT EXISTS migration_locks (
    id SERIAL PRIMARY KEY,
    migration_id VARCHAR(255) NOT NULL,
    locked_by VARCHAR(255) NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    released_at TIMESTAMP WITH TIME ZONE NULL,
    metadata JSONB DEFAULT '{}',

    CONSTRAINT active_lock_unique UNIQUE (migration_id, locked_by, released_at)
);

-- Indexes for migration_locks
CREATE INDEX idx_migration_locks_active ON migration_locks(migration_id)
    WHERE released_at IS NULL;

-- ============================================================================
-- Schema Snapshots Table
-- ============================================================================
-- Store periodic snapshots of the database schema for drift detection
CREATE TABLE IF NOT EXISTS schema_snapshots (
    id SERIAL PRIMARY KEY,
    database_type VARCHAR(20) NOT NULL,
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    schema_hash VARCHAR(64) NOT NULL,           -- Hash of entire schema
    schema_definition TEXT NOT NULL,            -- Full schema SQL/Cypher
    table_count INTEGER,
    index_count INTEGER,
    constraint_count INTEGER,
    metadata JSONB DEFAULT '{}',

    CONSTRAINT valid_snapshot_database_type CHECK (database_type IN ('postgresql', 'neo4j', 'timescale'))
);

-- Indexes for schema_snapshots
CREATE INDEX idx_schema_snapshots_database_type ON schema_snapshots(database_type);
CREATE INDEX idx_schema_snapshots_date ON schema_snapshots(snapshot_date DESC);
CREATE INDEX idx_schema_snapshots_hash ON schema_snapshots(schema_hash);

-- ============================================================================
-- Schema Drift Alerts Table
-- ============================================================================
-- Track detected schema drift incidents
CREATE TABLE IF NOT EXISTS schema_drift_alerts (
    id SERIAL PRIMARY KEY,
    database_type VARCHAR(20) NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    drift_type VARCHAR(50) NOT NULL,            -- 'missing_table', 'type_mismatch', etc.
    table_name VARCHAR(255),
    column_name VARCHAR(255),
    expected_value TEXT,
    actual_value TEXT,
    severity VARCHAR(20) DEFAULT 'medium',      -- 'low', 'medium', 'high', 'critical'
    resolved_at TIMESTAMP WITH TIME ZONE NULL,
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}',

    CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

-- Indexes for schema_drift_alerts
CREATE INDEX idx_schema_drift_alerts_detected_at ON schema_drift_alerts(detected_at DESC);
CREATE INDEX idx_schema_drift_alerts_severity ON schema_drift_alerts(severity);
CREATE INDEX idx_schema_drift_alerts_unresolved ON schema_drift_alerts(resolved_at)
    WHERE resolved_at IS NULL;

-- ============================================================================
-- Migration Dependencies Table
-- ============================================================================
-- Track migration dependencies for proper ordering
CREATE TABLE IF NOT EXISTS migration_dependencies (
    id SERIAL PRIMARY KEY,
    migration_id VARCHAR(255) NOT NULL,
    depends_on_migration_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE (migration_id, depends_on_migration_id),
    CONSTRAINT no_self_dependency CHECK (migration_id != depends_on_migration_id)
);

-- Indexes for migration_dependencies
CREATE INDEX idx_migration_dependencies_migration_id ON migration_dependencies(migration_id);
CREATE INDEX idx_migration_dependencies_depends_on ON migration_dependencies(depends_on_migration_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get current schema version for a database type
CREATE OR REPLACE FUNCTION get_current_schema_version(db_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    current_version VARCHAR;
BEGIN
    SELECT version INTO current_version
    FROM schema_versions
    WHERE database_type = db_type
    ORDER BY applied_at DESC
    LIMIT 1;

    RETURN COALESCE(current_version, '0.0.0');
END;
$$ LANGUAGE plpgsql;

-- Function to check if migration has been applied
CREATE OR REPLACE FUNCTION is_migration_applied(migration_file_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    migration_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migration_count
    FROM migration_history
    WHERE migration_file = migration_file_name
      AND status = 'completed';

    RETURN migration_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to acquire migration lock
CREATE OR REPLACE FUNCTION acquire_migration_lock(
    p_migration_id VARCHAR,
    p_locked_by VARCHAR,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    existing_lock INTEGER;
BEGIN
    -- Check for existing active locks
    SELECT COUNT(*) INTO existing_lock
    FROM migration_locks
    WHERE migration_id = p_migration_id
      AND released_at IS NULL;

    IF existing_lock > 0 THEN
        RETURN FALSE;
    END IF;

    -- Acquire lock
    INSERT INTO migration_locks (migration_id, locked_by, metadata)
    VALUES (p_migration_id, p_locked_by, p_metadata);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to release migration lock
CREATE OR REPLACE FUNCTION release_migration_lock(
    p_migration_id VARCHAR,
    p_locked_by VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE migration_locks
    SET released_at = NOW()
    WHERE migration_id = p_migration_id
      AND locked_by = p_locked_by
      AND released_at IS NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to log schema version change
CREATE OR REPLACE FUNCTION log_schema_version(
    p_version VARCHAR,
    p_database_type VARCHAR,
    p_migration_id VARCHAR,
    p_checksum VARCHAR,
    p_execution_time_ms INTEGER,
    p_applied_by VARCHAR,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
    version_id INTEGER;
BEGIN
    INSERT INTO schema_versions (
        version,
        database_type,
        migration_id,
        checksum,
        execution_time_ms,
        applied_by,
        metadata
    )
    VALUES (
        p_version,
        p_database_type,
        p_migration_id,
        p_checksum,
        p_execution_time_ms,
        p_applied_by,
        p_metadata
    )
    RETURNING id INTO version_id;

    RETURN version_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Initial Data
-- ============================================================================

-- Record this migration as the first version
INSERT INTO schema_versions (
    version,
    database_type,
    migration_id,
    checksum,
    execution_time_ms,
    applied_by,
    rollback_available,
    metadata
)
VALUES (
    '1.0.0',
    'postgresql',
    '000_schema_versions',
    encode(digest('000_schema_versions', 'sha256'), 'hex'),
    0,
    'system',
    TRUE,
    '{"description": "Initial schema versioning infrastructure"}'::jsonb
);

-- Record in migration history
INSERT INTO migration_history (
    migration_file,
    migration_id,
    checksum,
    status,
    metadata
)
VALUES (
    '000_schema_versions.sql',
    '000_schema_versions',
    encode(digest('000_schema_versions', 'sha256'), 'hex'),
    'completed',
    '{"description": "Schema versioning infrastructure", "breaking": false}'::jsonb
);

COMMIT;

-- ============================================================================
-- Rollback
-- ============================================================================

-- Rollback: Drop schema versioning infrastructure
/*
BEGIN;

DROP FUNCTION IF EXISTS log_schema_version(VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER, VARCHAR, JSONB);
DROP FUNCTION IF EXISTS release_migration_lock(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS acquire_migration_lock(VARCHAR, VARCHAR, JSONB);
DROP FUNCTION IF EXISTS is_migration_applied(VARCHAR);
DROP FUNCTION IF EXISTS get_current_schema_version(VARCHAR);

DROP TABLE IF EXISTS migration_dependencies CASCADE;
DROP TABLE IF EXISTS schema_drift_alerts CASCADE;
DROP TABLE IF EXISTS schema_snapshots CASCADE;
DROP TABLE IF EXISTS migration_locks CASCADE;
DROP TABLE IF EXISTS migration_history CASCADE;
DROP TABLE IF EXISTS schema_versions CASCADE;

COMMIT;
*/

-- ============================================================================
-- Validation
-- ============================================================================

-- Verify tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name IN (
        'schema_versions',
        'migration_history',
        'migration_locks',
        'schema_snapshots',
        'schema_drift_alerts',
        'migration_dependencies'
    );

    IF table_count != 6 THEN
        RAISE EXCEPTION 'Expected 6 tables, but found %', table_count;
    END IF;

    RAISE NOTICE '✅ All schema versioning tables created successfully';
END $$;

-- Verify functions were created
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname IN (
        'get_current_schema_version',
        'is_migration_applied',
        'acquire_migration_lock',
        'release_migration_lock',
        'log_schema_version'
    );

    IF function_count != 5 THEN
        RAISE EXCEPTION 'Expected 5 functions, but found %', function_count;
    END IF;

    RAISE NOTICE '✅ All helper functions created successfully';
END $$;

-- Test helper functions
DO $$
DECLARE
    current_version VARCHAR;
    is_applied BOOLEAN;
    lock_acquired BOOLEAN;
    lock_released BOOLEAN;
BEGIN
    -- Test get_current_schema_version
    SELECT get_current_schema_version('postgresql') INTO current_version;
    IF current_version != '1.0.0' THEN
        RAISE EXCEPTION 'Expected version 1.0.0, but got %', current_version;
    END IF;

    -- Test is_migration_applied
    SELECT is_migration_applied('000_schema_versions.sql') INTO is_applied;
    IF NOT is_applied THEN
        RAISE EXCEPTION 'Migration should be marked as applied';
    END IF;

    -- Test migration lock
    SELECT acquire_migration_lock('test_migration', 'test_user', '{}'::jsonb) INTO lock_acquired;
    IF NOT lock_acquired THEN
        RAISE EXCEPTION 'Failed to acquire migration lock';
    END IF;

    SELECT release_migration_lock('test_migration', 'test_user') INTO lock_released;
    IF NOT lock_released THEN
        RAISE EXCEPTION 'Failed to release migration lock';
    END IF;

    RAISE NOTICE '✅ All helper functions tested successfully';
END $$;

-- Display summary
SELECT
    '✅ Schema Versioning Infrastructure v1.0.0 deployed successfully' as status,
    get_current_schema_version('postgresql') as current_version,
    COUNT(*) as total_migrations
FROM migration_history;
