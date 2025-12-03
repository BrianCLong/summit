-- Create investigation_snapshots table
CREATE TABLE IF NOT EXISTS maestro.investigation_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id UUID NOT NULL REFERENCES maestro.investigations(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    snapshot_label VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_investigation_snapshots_investigation_id ON maestro.investigation_snapshots(investigation_id);
CREATE INDEX IF NOT EXISTS idx_investigation_snapshots_created_at ON maestro.investigation_snapshots(created_at);
