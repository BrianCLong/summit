-- Migration: Create workflow engine tables
-- Description: Initial schema for workflow definitions, executions, and human tasks

-- Workflow Definitions Table
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_definitions_name ON workflow_definitions(name);
CREATE INDEX idx_workflow_definitions_is_active ON workflow_definitions(is_active);
CREATE INDEX idx_workflow_definitions_created_by ON workflow_definitions(created_by);

-- Workflow Executions Table
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    workflow_version VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'paused')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    started_by VARCHAR(255),
    trigger_type VARCHAR(50) NOT NULL,
    trigger_data JSONB,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_step VARCHAR(255),
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    error JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at DESC);
CREATE INDEX idx_workflow_executions_started_by ON workflow_executions(started_by);

-- Human Tasks Table
CREATE TABLE IF NOT EXISTS human_tasks (
    id UUID PRIMARY KEY,
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assignees JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    form_data JSONB,
    submitted_by VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_human_tasks_execution_id ON human_tasks(execution_id);
CREATE INDEX idx_human_tasks_status ON human_tasks(status);
CREATE INDEX idx_human_tasks_assignees ON human_tasks USING GIN (assignees);
CREATE INDEX idx_human_tasks_due_date ON human_tasks(due_date);

-- Workflow Schedules Table
CREATE TABLE IF NOT EXISTS workflow_schedules (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    cron_expression VARCHAR(255) NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    enabled BOOLEAN DEFAULT true,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_schedules_workflow_id ON workflow_schedules(workflow_id);
CREATE INDEX idx_workflow_schedules_enabled ON workflow_schedules(enabled);
CREATE INDEX idx_workflow_schedules_next_run ON workflow_schedules(next_run);

-- Workflow Metrics Table (for monitoring and analytics)
CREATE TABLE IF NOT EXISTS workflow_metrics (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    dimensions JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_metrics_workflow_id ON workflow_metrics(workflow_id);
CREATE INDEX idx_workflow_metrics_execution_id ON workflow_metrics(execution_id);
CREATE INDEX idx_workflow_metrics_type ON workflow_metrics(metric_type);
CREATE INDEX idx_workflow_metrics_timestamp ON workflow_metrics(timestamp DESC);

-- Connector Configurations Table
CREATE TABLE IF NOT EXISTS connector_configs (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    base_url VARCHAR(500),
    authentication JSONB NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_connector_configs_type ON connector_configs(type);
CREATE INDEX idx_connector_configs_enabled ON connector_configs(enabled);

-- RPA Tasks Table
CREATE TABLE IF NOT EXISTS rpa_tasks (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    schedule VARCHAR(255),
    enabled BOOLEAN DEFAULT true,
    last_executed TIMESTAMP WITH TIME ZONE,
    next_execution TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rpa_tasks_type ON rpa_tasks(type);
CREATE INDEX idx_rpa_tasks_enabled ON rpa_tasks(enabled);
CREATE INDEX idx_rpa_tasks_next_execution ON rpa_tasks(next_execution);

-- RPA Executions Table
CREATE TABLE IF NOT EXISTS rpa_executions (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES rpa_tasks(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    result JSONB,
    error JSONB,
    retry_count INTEGER DEFAULT 0,
    duration INTEGER -- in milliseconds
);

CREATE INDEX idx_rpa_executions_task_id ON rpa_executions(task_id);
CREATE INDEX idx_rpa_executions_status ON rpa_executions(status);
CREATE INDEX idx_rpa_executions_started_at ON rpa_executions(started_at DESC);

-- Business Rules Tables
CREATE TABLE IF NOT EXISTS decision_tables (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
    outputs JSONB NOT NULL DEFAULT '[]'::jsonb,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    hit_policy VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_decision_tables_name ON decision_tables(name);
CREATE INDEX idx_decision_tables_version ON decision_tables(version);

-- Forms Table (for no-code builder)
CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    layout JSONB NOT NULL,
    validation JSONB,
    styling JSONB,
    logic JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forms_name ON forms(name);
CREATE INDEX idx_forms_version ON forms(version);

-- Form Submissions Table
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    submitted_by VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE,
    validation_errors JSONB,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_submissions_submitted_by ON form_submissions(submitted_by);

-- Event Store Table (for event sourcing)
CREATE TABLE IF NOT EXISTS event_store (
    id UUID PRIMARY KEY,
    event_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL
);

CREATE INDEX idx_event_store_aggregate ON event_store(aggregate_id, version);
CREATE INDEX idx_event_store_type ON event_store(event_type);
CREATE INDEX idx_event_store_timestamp ON event_store(timestamp DESC);

-- Snapshots Table (for event sourcing)
CREATE TABLE IF NOT EXISTS event_snapshots (
    aggregate_id VARCHAR(255) PRIMARY KEY,
    aggregate_type VARCHAR(255) NOT NULL,
    state JSONB NOT NULL,
    version INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_snapshots_type ON event_snapshots(aggregate_type);

-- Task Workers Table (for task routing)
CREATE TABLE IF NOT EXISTS task_workers (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    skill_levels JSONB NOT NULL DEFAULT '{}'::jsonb,
    capacity INTEGER DEFAULT 10,
    current_load INTEGER DEFAULT 0,
    availability VARCHAR(50) NOT NULL CHECK (availability IN ('available', 'busy', 'offline')),
    location VARCHAR(255),
    timezone VARCHAR(100),
    performance_rating NUMERIC(3,2) DEFAULT 5.0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_workers_availability ON task_workers(availability);
CREATE INDEX idx_task_workers_skills ON task_workers USING GIN (skills);

-- Routed Tasks Table
CREATE TABLE IF NOT EXISTS routed_tasks (
    id UUID PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    minimum_skill_level INTEGER,
    estimated_duration INTEGER,
    deadline TIMESTAMP WITH TIME ZONE,
    sla JSONB,
    assigned_to UUID REFERENCES task_workers(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'escalated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_routed_tasks_status ON routed_tasks(status);
CREATE INDEX idx_routed_tasks_assigned_to ON routed_tasks(assigned_to);
CREATE INDEX idx_routed_tasks_priority ON routed_tasks(priority);
CREATE INDEX idx_routed_tasks_deadline ON routed_tasks(deadline);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(255),
    changes JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_workflow_definitions_updated_at
    BEFORE UPDATE ON workflow_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_schedules_updated_at
    BEFORE UPDATE ON workflow_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connector_configs_updated_at
    BEFORE UPDATE ON connector_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rpa_tasks_updated_at
    BEFORE UPDATE ON rpa_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decision_tables_updated_at
    BEFORE UPDATE ON decision_tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_workers_updated_at
    BEFORE UPDATE ON task_workers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your environment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO intelgraph;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO intelgraph;
