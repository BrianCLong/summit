-- Migration for Graph-ML Active Learning 1.1 Review Queues
-- Created: 2026-04-06

CREATE TABLE IF NOT EXISTS ml_review_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    priority_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for tenant lookup
CREATE INDEX IF NOT EXISTS idx_ml_review_queues_tenant_id ON ml_review_queues(tenant_id);

CREATE TABLE IF NOT EXISTS ml_review_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL REFERENCES ml_review_queues(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL,
    data JSONB NOT NULL,
    confidence FLOAT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED, ABSTAINED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_id TEXT
);

-- Index for queue sampling (filtering by queue and status)
CREATE INDEX IF NOT EXISTS idx_ml_review_items_queue_status_conf ON ml_review_items(queue_id, status, confidence);
-- Index for tenant
CREATE INDEX IF NOT EXISTS idx_ml_review_items_tenant_id ON ml_review_items(tenant_id);
-- Index for created_at to help with age calculation queries
CREATE INDEX IF NOT EXISTS idx_ml_review_items_created_at ON ml_review_items(created_at);

CREATE TABLE IF NOT EXISTS ml_review_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES ml_review_items(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    decision TEXT NOT NULL, -- ACCEPTED, REJECTED, ABSTAIN
    reviewer_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Index for reporting on decisions
CREATE INDEX IF NOT EXISTS idx_ml_review_decisions_tenant_timestamp ON ml_review_decisions(tenant_id, timestamp);

-- RLS Disabled for now to prevent default deny, handled by application logic
-- ALTER TABLE ml_review_queues ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ml_review_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ml_review_decisions ENABLE ROW LEVEL SECURITY;
