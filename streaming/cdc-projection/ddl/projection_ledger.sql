-- Projection Ledger: Tracks the history of downstream projection updates.
-- This table is append-only to ensure a complete audit trail of all projection state changes.

CREATE TABLE IF NOT EXISTS projection_ledger (
    id SERIAL PRIMARY KEY,
    projection_name VARCHAR(255) NOT NULL,
    commit_lsn VARCHAR(64) NOT NULL,
    ts_source TIMESTAMP WITH TIME ZONE NOT NULL,
    evidence_id VARCHAR(128) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookup of the latest state per projection
CREATE INDEX IF NOT EXISTS idx_projection_ledger_name_applied ON projection_ledger (projection_name, applied_at DESC);
