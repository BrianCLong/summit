-- Event Log v2 Swap Migration (Phase D)
-- Atomically renames legacy tables and promotes partitioned tables.

BEGIN;

-- 1. Backup legacy data (rename)
ALTER TABLE IF EXISTS orchestrator_events RENAME TO orchestrator_events_legacy;
ALTER TABLE IF EXISTS orchestrator_outbox RENAME TO orchestrator_outbox_legacy;

-- 2. Promote partitioned tables
ALTER TABLE IF EXISTS orchestrator_events_p RENAME TO orchestrator_events;
ALTER TABLE IF EXISTS orchestrator_outbox_p RENAME TO orchestrator_outbox;

-- 3. Cleanup indices (optional, but good for naming consistency)
-- Most indices are already on the children, but the parent index names might need care.
-- Postgres automatically handles most of this during renames.

COMMIT;
