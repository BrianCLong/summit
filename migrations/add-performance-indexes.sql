-- Performance Optimization: Add Composite Indexes
-- This migration adds composite indexes for common query patterns
-- to improve query performance across the application

-- Enable timing for performance tracking
\timing on

-- ============================================================================
-- ENTITIES TABLE INDEXES
-- ============================================================================

-- Composite index for tenant + type queries (most common pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_tenant_type
ON entities (tenant_id, type);

-- Composite index for tenant + creation time (timeline queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_tenant_created
ON entities (tenant_id, created_at DESC);

-- Composite index for type + confidence (filtered entity queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_type_confidence
ON entities (type, confidence)
WHERE confidence > 0.5;

-- Composite index for canonical ID + tenant (deduplication queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_canonical_tenant
ON entities (canonical_id, tenant_id)
WHERE canonical_id IS NOT NULL;

-- Index for updated timestamp (change tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_updated
ON entities (updated_at DESC);

-- ============================================================================
-- RELATIONSHIPS TABLE INDEXES
-- ============================================================================

-- Composite index for source + target (relationship traversal)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationships_source_target
ON relationships (source_id, target_id);

-- Composite index for tenant + type (filtered relationship queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationships_tenant_type
ON relationships (tenant_id, type);

-- Composite index for tenant + creation time (timeline queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationships_tenant_created
ON relationships (tenant_id, created_at DESC);

-- Index for target ID (reverse relationship queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationships_target
ON relationships (target_id);

-- Composite index for type + confidence
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationships_type_confidence
ON relationships (type, confidence)
WHERE confidence > 0.5;

-- ============================================================================
-- INVESTIGATIONS TABLE INDEXES
-- ============================================================================

-- Composite index for tenant + status (active investigations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigations_tenant_status
ON investigations (tenant_id, status);

-- Composite index for tenant + priority (prioritized investigations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigations_tenant_priority
ON investigations (tenant_id, priority);

-- Composite index for status + creation time (recent active)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigations_status_created
ON investigations (status, created_at DESC);

-- Partial index for assigned investigations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigations_assigned_user
ON investigations (assigned_to, status)
WHERE assigned_to IS NOT NULL;

-- Index for updated timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigations_updated
ON investigations (updated_at DESC);

-- ============================================================================
-- SOURCES TABLE INDEXES
-- ============================================================================

-- Composite index for tenant + type (source filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sources_tenant_type
ON sources (tenant_id, type);

-- Composite index for entity + creation time (entity provenance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sources_entity_created
ON sources (entity_id, created_at DESC);

-- Index for URL-based source lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sources_url
ON sources USING hash (url)
WHERE url IS NOT NULL;

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

-- Composite index for tenant + role (RBAC queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_role
ON users (tenant_id, role);

-- Unique composite index for email + tenant
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_tenant
ON users (email, tenant_id);

-- Index for last login (activity tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login
ON users (last_login DESC NULLS LAST);

-- ============================================================================
-- AUDIT_LOGS TABLE INDEXES (if table exists)
-- ============================================================================

-- Check if audit_logs table exists before creating indexes
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'audit_logs') THEN
        -- Composite index for tenant + creation time
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_tenant_created
        ON audit_logs (tenant_id, created_at DESC);

        -- Composite index for user + action
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_user_action
        ON audit_logs (user_id, action);

        -- Partial index for errors
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_errors
        ON audit_logs (created_at DESC)
        WHERE status = 'error';
    END IF;
END $$;

-- ============================================================================
-- ENTITY_EMBEDDINGS TABLE INDEXES
-- ============================================================================

-- Index for entity lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entity_embeddings_entity
ON entity_embeddings (entity_id);

-- Index for creation time (embedding freshness)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entity_embeddings_created
ON entity_embeddings (created_at DESC);

-- ============================================================================
-- MCP_SESSIONS TABLE INDEXES
-- ============================================================================

-- Composite index for user + creation time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_sessions_user_created
ON mcp_sessions (user_id, created_at DESC);

-- Partial index for active sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_sessions_active
ON mcp_sessions (created_at DESC)
WHERE status = 'active';

-- ============================================================================
-- MCP_SERVERS TABLE INDEXES
-- ============================================================================

-- Check if mcp_servers table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'mcp_servers') THEN
        -- Index for tenant lookup
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_servers_tenant
        ON mcp_servers (tenant_id);

        -- Index for fingerprint lookup
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_servers_fingerprint
        ON mcp_servers USING hash (fingerprint)
        WHERE fingerprint IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- PIPELINES TABLE INDEXES
-- ============================================================================

-- Composite index for tenant + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipelines_tenant_status
ON pipelines (tenant_id, status);

-- Index for creation time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipelines_created
ON pipelines (created_at DESC);

-- ============================================================================
-- RUNS TABLE INDEXES (if table exists)
-- ============================================================================

-- Check if runs table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'runs') THEN
        -- Composite index for pipeline + status
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_runs_pipeline_status
        ON runs (pipeline_id, status);

        -- Index for creation time
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_runs_created
        ON runs (created_at DESC);

        -- Partial index for failed runs
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_runs_failed
        ON runs (created_at DESC)
        WHERE status = 'failed';
    END IF;
END $$;

-- ============================================================================
-- ENABLE pg_stat_statements FOR QUERY MONITORING
-- ============================================================================

-- Enable pg_stat_statements extension for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================================
-- ANALYZE TABLES TO UPDATE STATISTICS
-- ============================================================================

-- Analyze all tables to update statistics for query planner
ANALYZE entities;
ANALYZE relationships;
ANALYZE investigations;
ANALYZE sources;
ANALYZE users;
ANALYZE entity_embeddings;
ANALYZE mcp_sessions;
ANALYZE pipelines;

-- Conditionally analyze tables that may not exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'audit_logs') THEN
        ANALYZE audit_logs;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'mcp_servers') THEN
        ANALYZE mcp_servers;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'runs') THEN
        ANALYZE runs;
    END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Display index information
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Display total index size
SELECT
    pg_size_pretty(SUM(pg_relation_size(indexname::regclass))) AS total_index_size
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';

\echo 'Performance indexes created successfully!'
