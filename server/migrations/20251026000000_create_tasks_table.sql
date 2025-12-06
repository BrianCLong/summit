CREATE TABLE IF NOT EXISTS runs (
    id UUID PRIMARY KEY,
    pipeline_id UUID,
    pipeline_name VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    cost DECIMAL(10, 4),
    input_params JSONB,
    output_data JSONB,
    error_message TEXT,
    executor_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_tenant_id ON runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_runs_pipeline_id ON runs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES runs(id),
    parent_task_id UUID REFERENCES tasks(id),
    status VARCHAR(50) NOT NULL,
    kind VARCHAR(50) NOT NULL,
    description TEXT,
    input_params JSONB,
    output_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_run_id ON tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
