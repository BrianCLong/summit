-- Case Overview Cache - Materialized cache for overview metrics
-- Provides fast retrieval of case overview counts with stale-while-revalidate semantics

CREATE TABLE IF NOT EXISTS maestro.case_overview_cache (
    case_id UUID PRIMARY KEY REFERENCES maestro.cases(id) ON DELETE CASCADE,
    tenant_id VARCHAR(255) NOT NULL,
    entity_count INTEGER NOT NULL DEFAULT 0,
    task_count INTEGER NOT NULL DEFAULT 0,
    open_task_count INTEGER NOT NULL DEFAULT 0,
    participant_count INTEGER NOT NULL DEFAULT 0,
    transition_count INTEGER NOT NULL DEFAULT 0,
    audit_event_count INTEGER NOT NULL DEFAULT 0,
    top_entities JSONB NOT NULL DEFAULT '[]',
    last_activity_at TIMESTAMP WITH TIME ZONE,
    refreshed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    refresh_status VARCHAR(20) NOT NULL DEFAULT 'fresh' CHECK (refresh_status IN ('fresh', 'revalidating', 'stale')),
    hit_count BIGINT NOT NULL DEFAULT 0,
    miss_count BIGINT NOT NULL DEFAULT 0,
    last_hit_at TIMESTAMP WITH TIME ZONE,
    last_miss_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_case_overview_cache_tenant_id ON maestro.case_overview_cache(tenant_id);
CREATE INDEX IF NOT EXISTS idx_case_overview_cache_expiry ON maestro.case_overview_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_case_overview_cache_status ON maestro.case_overview_cache(refresh_status);

COMMENT ON TABLE maestro.case_overview_cache IS 'Materialized cache of case overview metrics (counts, top entities, last activity).';
COMMENT ON COLUMN maestro.case_overview_cache.entity_count IS 'Number of active graph/entity references for the case.';
COMMENT ON COLUMN maestro.case_overview_cache.task_count IS 'Total tasks tracked for the case.';
COMMENT ON COLUMN maestro.case_overview_cache.open_task_count IS 'Open tasks (non completed/cancelled).';
COMMENT ON COLUMN maestro.case_overview_cache.top_entities IS 'Ordered list of most referenced graph entities for the case.';
COMMENT ON COLUMN maestro.case_overview_cache.last_activity_at IS 'Most recent activity timestamp across tasks, transitions, audit logs, or entity changes.';
COMMENT ON COLUMN maestro.case_overview_cache.hit_count IS 'API hit count for cache effectiveness tracking.';
COMMENT ON COLUMN maestro.case_overview_cache.miss_count IS 'Cache miss count for cache effectiveness tracking.';
