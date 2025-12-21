-- Example reversible migration
BEGIN;
ALTER TABLE claim ADD COLUMN IF NOT EXISTS comment TEXT;
-- down: ALTER TABLE claim DROP COLUMN comment;
COMMIT;
