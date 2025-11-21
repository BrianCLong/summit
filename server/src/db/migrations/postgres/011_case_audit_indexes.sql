-- Performance indexes for Case Spaces and Audit Access Logs
-- These indexes optimize common query patterns for production workloads

-- Composite indexes for common case queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_tenant_status
    ON maestro.cases(tenant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_tenant_compartment_status
    ON maestro.cases(tenant_id, compartment, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_tenant_created_desc
    ON maestro.cases(tenant_id, created_at DESC);

-- Partial index for active cases only (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_active_only
    ON maestro.cases(tenant_id, created_at DESC)
    WHERE status IN ('open', 'active');

-- Composite indexes for common audit queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_tenant_case_created
    ON maestro.audit_access_logs(tenant_id, case_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_tenant_user_created
    ON maestro.audit_access_logs(tenant_id, user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_tenant_action_created
    ON maestro.audit_access_logs(tenant_id, action, created_at DESC);

-- Covering index for ombudsman queries (includes frequently selected columns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_ombudsman_query
    ON maestro.audit_access_logs(tenant_id, created_at DESC)
    INCLUDE (case_id, user_id, action, legal_basis, reason);

-- Partial index for court orders and warrants (high priority queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_court_orders
    ON maestro.audit_access_logs(tenant_id, warrant_id, created_at DESC)
    WHERE legal_basis = 'court_order' AND warrant_id IS NOT NULL;

-- BRIN index for time-series audit data (efficient for large tables)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_created_brin
    ON maestro.audit_access_logs USING BRIN(created_at)
    WITH (pages_per_range = 128);

-- Table statistics for query optimizer
ANALYZE maestro.cases;
ANALYZE maestro.audit_access_logs;

-- Comments
COMMENT ON INDEX maestro.idx_cases_tenant_status IS 'Optimizes listing cases by status within a tenant';
COMMENT ON INDEX maestro.idx_audit_ombudsman_query IS 'Covering index for common ombudsman audit queries';
COMMENT ON INDEX maestro.idx_audit_created_brin IS 'BRIN index for efficient time-range queries on large audit tables';
