-- Migration: Create GraphRAG Query Preview and Glass-Box Run tables
-- Created: 2025-11-20
-- Description: Adds support for query preview, cost estimation, and glass-box run capture

-- Glass-Box Runs table - captures execution runs with full observability
CREATE TABLE IF NOT EXISTS glass_box_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('graphrag_query', 'nl_to_cypher', 'nl_to_sql', 'subgraph_retrieval')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

    -- Input capture
    prompt TEXT NOT NULL,
    parameters JSONB DEFAULT '{}',

    -- Execution trace
    steps JSONB DEFAULT '[]',
    tool_calls JSONB DEFAULT '[]',

    -- Output capture
    result JSONB,
    error TEXT,

    -- Metadata
    model_used TEXT,
    tokens_used INTEGER,
    cost_estimate DECIMAL(10, 6),
    confidence DECIMAL(3, 2),

    -- Timing
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Replay support
    replayable BOOLEAN DEFAULT TRUE,
    parent_run_id UUID REFERENCES glass_box_runs(id) ON DELETE SET NULL,
    replay_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for glass_box_runs
CREATE INDEX idx_glass_box_runs_investigation_id ON glass_box_runs(investigation_id);
CREATE INDEX idx_glass_box_runs_tenant_id ON glass_box_runs(tenant_id);
CREATE INDEX idx_glass_box_runs_user_id ON glass_box_runs(user_id);
CREATE INDEX idx_glass_box_runs_type_status ON glass_box_runs(type, status);
CREATE INDEX idx_glass_box_runs_created_at ON glass_box_runs(created_at DESC);
CREATE INDEX idx_glass_box_runs_parent_run_id ON glass_box_runs(parent_run_id) WHERE parent_run_id IS NOT NULL;

-- Query Previews table - stores NL→Cypher/SQL translations with cost/risk analysis
CREATE TABLE IF NOT EXISTS query_previews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,

    -- Input
    natural_language_query TEXT NOT NULL,
    parameters JSONB DEFAULT '{}',

    -- Generated query
    language TEXT NOT NULL CHECK (language IN ('cypher', 'sql')),
    generated_query TEXT NOT NULL,
    query_explanation TEXT NOT NULL,

    -- Analysis
    cost_estimate JSONB NOT NULL,
    risk_assessment JSONB NOT NULL,
    syntactically_valid BOOLEAN DEFAULT TRUE,
    validation_errors JSONB DEFAULT '[]',

    -- Execution control
    can_execute BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    sandbox_only BOOLEAN DEFAULT FALSE,

    -- Metadata
    model_used TEXT NOT NULL,
    confidence DECIMAL(3, 2) NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    -- Execution tracking
    executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMPTZ,
    execution_run_id UUID REFERENCES glass_box_runs(id) ON DELETE SET NULL,

    -- Edit tracking
    edited_query TEXT,
    edited_by TEXT,
    edited_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query_previews
CREATE INDEX idx_query_previews_investigation_id ON query_previews(investigation_id);
CREATE INDEX idx_query_previews_tenant_id ON query_previews(tenant_id);
CREATE INDEX idx_query_previews_user_id ON query_previews(user_id);
CREATE INDEX idx_query_previews_language ON query_previews(language);
CREATE INDEX idx_query_previews_executed ON query_previews(executed) WHERE NOT executed;
CREATE INDEX idx_query_previews_expires_at ON query_previews(expires_at);
CREATE INDEX idx_query_previews_created_at ON query_previews(created_at DESC);
CREATE INDEX idx_query_previews_execution_run_id ON query_previews(execution_run_id) WHERE execution_run_id IS NOT NULL;

-- GIN index for JSON search on parameters
CREATE INDEX idx_query_previews_parameters_gin ON query_previews USING GIN (parameters);
CREATE INDEX idx_glass_box_runs_parameters_gin ON glass_box_runs USING GIN (parameters);
CREATE INDEX idx_glass_box_runs_steps_gin ON glass_box_runs USING GIN (steps);
CREATE INDEX idx_glass_box_runs_tool_calls_gin ON glass_box_runs USING GIN (tool_calls);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at updates
CREATE TRIGGER update_glass_box_runs_updated_at
    BEFORE UPDATE ON glass_box_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_query_previews_updated_at
    BEFORE UPDATE ON query_previews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE glass_box_runs IS 'Captures execution runs with full observability for replay and debugging';
COMMENT ON TABLE query_previews IS 'Stores natural language to Cypher/SQL translations with cost and risk analysis';

COMMENT ON COLUMN glass_box_runs.steps IS 'Array of execution steps with timing and results';
COMMENT ON COLUMN glass_box_runs.tool_calls IS 'Array of tool invocations with parameters and results';
COMMENT ON COLUMN glass_box_runs.replayable IS 'Whether this run can be replayed with modifications';
COMMENT ON COLUMN glass_box_runs.parent_run_id IS 'Original run ID if this is a replay';

COMMENT ON COLUMN query_previews.cost_estimate IS 'JSON with cost level, estimated rows, time, and breakdown';
COMMENT ON COLUMN query_previews.risk_assessment IS 'JSON with risk level, concerns, PII fields, and recommendations';
COMMENT ON COLUMN query_previews.sandbox_only IS 'Whether query can only be executed in sandbox mode';
COMMENT ON COLUMN query_previews.expires_at IS 'Timestamp when this preview expires and should be regenerated';

-- Cleanup function for expired previews
CREATE OR REPLACE FUNCTION cleanup_expired_query_previews()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM query_previews
    WHERE expires_at < NOW()
    AND NOT executed;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_query_previews IS 'Removes expired query previews that were never executed';

-- Cleanup function for old completed runs
CREATE OR REPLACE FUNCTION cleanup_old_glass_box_runs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM glass_box_runs
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND status IN ('completed', 'failed', 'cancelled');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_glass_box_runs IS 'Removes old completed/failed/cancelled runs older than specified days';
