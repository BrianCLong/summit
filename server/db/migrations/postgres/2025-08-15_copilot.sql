-- IntelGraph Copilot Persistence Schema
-- This migration adds tables for durable Copilot run persistence

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Drop tables if they exist (for development)
-- AUDIT: ALLOW DESTRUCTIVE
DROP TABLE IF EXISTS copilot_events CASCADE;
-- AUDIT: ALLOW DESTRUCTIVE
DROP TABLE IF EXISTS copilot_tasks CASCADE;
-- AUDIT: ALLOW DESTRUCTIVE
DROP TABLE IF EXISTS copilot_runs CASCADE;

-- Create enum types for better type safety
CREATE TYPE copilot_run_status AS ENUM ('pending', 'running', 'succeeded', 'failed', 'paused');
CREATE TYPE copilot_task_status AS ENUM ('pending', 'running', 'succeeded', 'failed', 'skipped');
CREATE TYPE copilot_event_level AS ENUM ('info', 'warning', 'error', 'debug', 'progress');

-- Copilot Runs Table
CREATE TABLE copilot_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID,
    goal_text TEXT NOT NULL,
    investigation_id UUID,
    status copilot_run_status NOT NULL DEFAULT 'pending',
    plan JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

-- Copilot Tasks Table
CREATE TABLE copilot_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES copilot_runs(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    task_type TEXT NOT NULL,
    input_params JSONB DEFAULT '{}',
    output_data JSONB,
    status copilot_task_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    
    -- Ensure ordered execution within a run
    CONSTRAINT unique_run_sequence UNIQUE (run_id, sequence_number)
);

-- Copilot Events Table (for real-time streaming and audit)
CREATE TABLE copilot_events (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES copilot_runs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES copilot_tasks(id) ON DELETE SET NULL,
    event_level copilot_event_level NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_copilot_runs_status ON copilot_runs(status);
CREATE INDEX idx_copilot_runs_created_at ON copilot_runs(created_at DESC);
CREATE INDEX idx_copilot_runs_investigation ON copilot_runs(investigation_id);

CREATE INDEX idx_copilot_tasks_run_id ON copilot_tasks(run_id);
CREATE INDEX idx_copilot_tasks_sequence ON copilot_tasks(run_id, sequence_number);
CREATE INDEX idx_copilot_tasks_status ON copilot_tasks(status);

CREATE INDEX idx_copilot_events_run_id ON copilot_events(run_id);
CREATE INDEX idx_copilot_events_created_at ON copilot_events(created_at DESC);
CREATE INDEX idx_copilot_events_task_id ON copilot_events(task_id) WHERE task_id IS NOT NULL;

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at
CREATE TRIGGER update_copilot_runs_updated_at
    BEFORE UPDATE ON copilot_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add some useful views for analytics
CREATE VIEW copilot_run_summary AS
SELECT 
    r.id,
    r.goal_text,
    r.status,
    r.created_at,
    r.started_at,
    r.finished_at,
    (r.finished_at - r.started_at) AS duration,
    COUNT(t.id) AS total_tasks,
    COUNT(CASE WHEN t.status = 'succeeded' THEN 1 END) AS completed_tasks,
    COUNT(CASE WHEN t.status = 'failed' THEN 1 END) AS failed_tasks
FROM copilot_runs r
LEFT JOIN copilot_tasks t ON r.id = t.run_id
GROUP BY r.id, r.goal_text, r.status, r.created_at, r.started_at, r.finished_at;

-- Sample data for testing (optional)
INSERT INTO copilot_runs (goal_text, investigation_id, status, plan) VALUES 
(
    'Analyze network connections for suspicious activity',
    uuid_generate_v4(),
    'pending',
    '{
        "id": "plan-001",
        "steps": [
            {"id": "step-1", "kind": "NEO4J_QUERY", "input": "MATCH (n)-[r]-(m) RETURN count(*)"},
            {"id": "step-2", "kind": "GRAPH_ANALYTICS", "input": "pagerank"},
            {"id": "step-3", "kind": "SUMMARIZE", "input": "top_nodes"}
        ]
    }'
);

-- Comments for documentation
COMMENT ON TABLE copilot_runs IS 'Stores Copilot execution runs with goals and plans';
COMMENT ON TABLE copilot_tasks IS 'Individual tasks within a Copilot run execution';
COMMENT ON TABLE copilot_events IS 'Real-time events and logs from Copilot execution';

COMMENT ON COLUMN copilot_runs.plan IS 'JSON plan with steps generated for the goal';
COMMENT ON COLUMN copilot_runs.metadata IS 'Additional metadata for the run (user, tenant, etc.)';
COMMENT ON COLUMN copilot_tasks.input_params IS 'Input parameters for the task execution';
COMMENT ON COLUMN copilot_tasks.output_data IS 'Task execution output and results';
COMMENT ON COLUMN copilot_events.payload IS 'Additional event data and context';