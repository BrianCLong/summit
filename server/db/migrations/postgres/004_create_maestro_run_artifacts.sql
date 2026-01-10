-- server/db/migrations/postgres/004_create_maestro_run_artifacts.sql

CREATE TYPE maestro_run_status AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

CREATE TABLE maestro_run_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL UNIQUE,
    pipeline_name VARCHAR(255) NOT NULL,
    status maestro_run_status NOT NULL DEFAULT 'PENDING',
    artifacts JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maestro_run_artifacts_pipeline_name ON maestro_run_artifacts(pipeline_name);
CREATE INDEX idx_maestro_run_artifacts_status ON maestro_run_artifacts(status);

-- Trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_maestro_run_artifacts_updated_at
BEFORE UPDATE ON maestro_run_artifacts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
