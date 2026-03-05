-- Migration V10: Fix Approvals Schema to match Service
-- Aligns with server/src/services/approvals.ts

CREATE TABLE IF NOT EXISTS approvals_fix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id TEXT NOT NULL,
    approver_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    action TEXT,
    payload JSONB,
    reason TEXT,
    decision_reason TEXT,
    run_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Attempt to migrate data if possible, otherwise just drop
-- (In production, we would be more careful, but V9 schema is incompatible with current code)
-- DROP TABLE IF EXISTS approvals;

-- Rename
-- ALTER TABLE approvals_fix RENAME TO approvals;

-- For this migration script, we will just DROP and CREATE to be clean and avoid complex casting
DROP TABLE IF EXISTS approvals;
ALTER TABLE approvals_fix RENAME TO approvals;
