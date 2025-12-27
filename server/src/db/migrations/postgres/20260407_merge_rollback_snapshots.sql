-- Merge rollback snapshots
-- Created: 2026-04-07

CREATE TABLE IF NOT EXISTS er_merge_rollback_snapshots (
    id TEXT PRIMARY KEY,
    merge_id TEXT NOT NULL UNIQUE,
    decision_id TEXT NOT NULL,
    master_id TEXT NOT NULL,
    merge_ids JSONB NOT NULL,
    snapshot JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    restored_at TIMESTAMPTZ,
    restored_by TEXT,
    restore_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_er_merge_snapshots_decision_id
  ON er_merge_rollback_snapshots(decision_id);
CREATE INDEX IF NOT EXISTS idx_er_merge_snapshots_created_at
  ON er_merge_rollback_snapshots(created_at DESC);
