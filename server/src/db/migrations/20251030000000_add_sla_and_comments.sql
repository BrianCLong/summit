
-- Migration: Add SLA Timers and Comments tables
-- Epic: Collaboration, Ops & Reliability
-- Date: 2025-05-15

-- -----------------------------------------------------------------------------
-- 1. SLA Timers (Case Management)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maestro.case_sla_timers (
    sla_id UUID PRIMARY KEY,
    case_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- RESPONSE_TIME, RESOLUTION_TIME, etc.
    name VARCHAR(255) NOT NULL,

    start_time TIMESTAMPTZ NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,

    status VARCHAR(50) NOT NULL, -- ACTIVE, PAUSED, COMPLETED, BREACHED, CANCELLED
    target_duration_seconds INTEGER NOT NULL,

    metadata JSONB DEFAULT '{}'::jsonb,

    -- Indexes
    CONSTRAINT fk_case_sla_case FOREIGN KEY (case_id) REFERENCES maestro.cases(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_sla_timers_case_id ON maestro.case_sla_timers(case_id);
CREATE INDEX IF NOT EXISTS idx_case_sla_timers_deadline ON maestro.case_sla_timers(deadline) WHERE status = 'ACTIVE';

-- -----------------------------------------------------------------------------
-- 2. Universal Comments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maestro.comments (
    comment_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,

    target_type VARCHAR(50) NOT NULL, -- NODE, CASE, TASK, DOCUMENT
    target_id VARCHAR(255) NOT NULL,

    parent_id UUID, -- For replies
    root_id UUID,   -- Top-level comment

    content TEXT NOT NULL,
    author_id UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    mentions TEXT[], -- Array of user IDs

    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,

    metadata JSONB DEFAULT '{}'::jsonb,

    -- Foreign Key for replies (self-referencing)
    CONSTRAINT fk_comment_parent FOREIGN KEY (parent_id) REFERENCES maestro.comments(comment_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON maestro.comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_root ON maestro.comments(root_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON maestro.comments(created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION maestro.update_comments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_comments_timestamp
BEFORE UPDATE ON maestro.comments
FOR EACH ROW
EXECUTE FUNCTION maestro.update_comments_timestamp();
