
-- Partitioning Maestro Runs Table
-- This migration partitions the maestro_runs table by tenant_id (List Partitioning)
-- Since we cannot easily convert an existing table to partitioned in one go without downtime/renaming,
-- we will use a "future-proof" approach:
-- 1. Rename existing table to legacy
-- 2. Create new partitioned table
-- 3. Attach default partition for old data (if possible) or migrate data.

-- Note: For this exercise, assuming we are setting up for scale, we will use LIST partitioning on tenant_id
-- as it allows for easy data isolation and potentially different storage backends per tenant in the future.
-- Another common strategy is RANGE partitioning on started_at, but tenant isolation is often more critical for SaaS.

BEGIN;

-- 1. Rename existing table
ALTER TABLE maestro_runs RENAME TO maestro_runs_legacy;

-- 2. Create new partitioned table
CREATE TABLE maestro_runs (
  id TEXT NOT NULL, -- id is no longer primary key globally without including partition key, but we can enforce uniqueness per partition
  tenant_id TEXT NOT NULL,
  template_id TEXT NOT NULL, -- references removed for performance in partitioning, enforced by app or triggers if needed
  template_version INTEGER NOT NULL,
  created_by_principal_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  input JSONB,
  output JSONB,
  error_summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, id) -- Composite PK required for partitioning
) PARTITION BY LIST (tenant_id);

-- 3. Create a default partition for any tenants not explicitly partitioned
CREATE TABLE maestro_runs_default PARTITION OF maestro_runs DEFAULT;

-- 4. Migrate data (Optional, depending on volume. Doing it here for completeness)
INSERT INTO maestro_runs (
  id, tenant_id, template_id, template_version, created_by_principal_id,
  status, started_at, completed_at, input, output, error_summary, metadata
)
SELECT
  id, tenant_id, template_id, template_version, created_by_principal_id,
  status, started_at, completed_at, input, output, error_summary, metadata
FROM maestro_runs_legacy;

-- 5. Recreate Indices
CREATE INDEX idx_maestro_runs_tenant_partitioned ON maestro_runs(tenant_id);
CREATE INDEX idx_maestro_runs_status_partitioned ON maestro_runs(status);
CREATE INDEX idx_maestro_runs_started_at_partitioned ON maestro_runs(started_at);

-- 6. Cleanup (Optional, keeping legacy table for safety in real prod scenario, but dropping here to keep schema clean)
-- DROP TABLE maestro_runs_legacy;

COMMIT;
