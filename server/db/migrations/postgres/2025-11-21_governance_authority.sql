-- Data Governance Authority Schema

-- Lineage Nodes: Represents datasets, jobs, reports, etc.
CREATE TABLE IF NOT EXISTS lineage_nodes (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'DATASET', 'JOB', 'REPORT', 'FIELD'
    schema_hash TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lineage_nodes_type ON lineage_nodes(type);
CREATE INDEX IF NOT EXISTS idx_lineage_nodes_name ON lineage_nodes(name);

-- Lineage Edges: Represents flow (e.g., JOB reads DATASET)
CREATE TABLE IF NOT EXISTS lineage_edges (
    source_id UUID NOT NULL REFERENCES lineage_nodes(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES lineage_nodes(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'READS', 'WRITES', 'DERIVED_FROM'
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (source_id, target_id, type)
);

CREATE INDEX IF NOT EXISTS idx_lineage_edges_source ON lineage_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_lineage_edges_target ON lineage_edges(target_id);

-- Schema Snapshots: For drift detection
CREATE TABLE IF NOT EXISTS schema_snapshots (
    id UUID PRIMARY KEY,
    node_id UUID NOT NULL REFERENCES lineage_nodes(id) ON DELETE CASCADE,
    schema_definition JSONB NOT NULL,
    schema_hash TEXT NOT NULL,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schema_snapshots_node ON schema_snapshots(node_id);
CREATE INDEX IF NOT EXISTS idx_schema_snapshots_hash ON schema_snapshots(schema_hash);

-- Retention Policies
CREATE TABLE IF NOT EXISTS retention_policies (
    id UUID PRIMARY KEY,
    target_type TEXT NOT NULL, -- e.g., 'audit_logs', 'provenance_entries'
    retention_days INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'DELETE', 'ARCHIVE'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrity/Compaction Logs
CREATE TABLE IF NOT EXISTS governance_tasks_log (
    id UUID PRIMARY KEY,
    task_type TEXT NOT NULL, -- 'COMPACTION', 'RETENTION', 'DRIFT_CHECK'
    status TEXT NOT NULL,
    details JSONB,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ
);
