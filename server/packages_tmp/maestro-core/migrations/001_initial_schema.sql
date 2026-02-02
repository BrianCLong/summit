-- Maestro Orchestrator Database Schema
-- Initial schema for workflow runs and step executions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workflow runs table
CREATE TABLE workflow_runs (
    run_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_name VARCHAR(255) NOT NULL,
    workflow_version VARCHAR(50) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    triggered_by VARCHAR(255) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    parameters JSONB DEFAULT '{}',
    budget JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step executions table
CREATE TABLE step_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_id VARCHAR(255) NOT NULL,
    run_id UUID NOT NULL REFERENCES workflow_runs(run_id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    attempt INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    output JSONB,
    error TEXT,
    cost_usd DECIMAL(10,4),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Artifacts table for storing step outputs
CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES workflow_runs(run_id) ON DELETE CASCADE,
    step_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    size_bytes BIGINT,
    storage_path TEXT NOT NULL,
    checksum_sha256 VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy decisions table for audit trail
CREATE TABLE policy_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES workflow_runs(run_id) ON DELETE CASCADE,
    step_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    attributes JSONB DEFAULT '{}',
    decision VARCHAR(20) NOT NULL, -- 'allow' or 'deny'
    reason TEXT,
    policy_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_workflow_runs_tenant_status ON workflow_runs(tenant_id, status);
CREATE INDEX idx_workflow_runs_created_at ON workflow_runs(created_at);
CREATE INDEX idx_step_executions_run_id ON step_executions(run_id);
CREATE INDEX idx_step_executions_status ON step_executions(status);
CREATE INDEX idx_step_executions_run_step ON step_executions(run_id, step_id);
CREATE INDEX idx_artifacts_run_id ON artifacts(run_id);
CREATE INDEX idx_policy_decisions_run_id ON policy_decisions(run_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workflow_runs_updated_at 
    BEFORE UPDATE ON workflow_runs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_step_executions_updated_at 
    BEFORE UPDATE ON step_executions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW workflow_run_summary AS
SELECT 
    wr.run_id,
    wr.workflow_name,
    wr.workflow_version,
    wr.tenant_id,
    wr.environment,
    wr.status,
    wr.created_at,
    wr.completed_at,
    COUNT(se.id) as total_steps,
    COUNT(CASE WHEN se.status = 'succeeded' THEN 1 END) as completed_steps,
    COUNT(CASE WHEN se.status = 'failed' THEN 1 END) as failed_steps,
    COUNT(CASE WHEN se.status = 'running' THEN 1 END) as running_steps,
    COALESCE(SUM(se.cost_usd), 0) as total_cost_usd,
    EXTRACT(EPOCH FROM (wr.completed_at - wr.created_at)) as duration_seconds
FROM workflow_runs wr
LEFT JOIN step_executions se ON wr.run_id = se.run_id
GROUP BY wr.run_id, wr.workflow_name, wr.workflow_version, wr.tenant_id, 
         wr.environment, wr.status, wr.created_at, wr.completed_at;

-- Cost tracking view
CREATE VIEW cost_by_tenant_day AS
SELECT 
    wr.tenant_id,
    DATE(wr.created_at) as execution_date,
    COUNT(DISTINCT wr.run_id) as total_runs,
    COALESCE(SUM(se.cost_usd), 0) as total_cost_usd
FROM workflow_runs wr
LEFT JOIN step_executions se ON wr.run_id = se.run_id
GROUP BY wr.tenant_id, DATE(wr.created_at)
ORDER BY execution_date DESC, total_cost_usd DESC;