-- infra/postgres/provsql-extension.sql
-- PROVSQL PILOT SETUP
-- ====================
-- This script enables granular provenance capture for the 'analysis_results' table.
-- It is designed to be idempotent and safe for existing data (non-mutating trigger).

BEGIN;

-- 1. Enable Extension
-- NOTE: Requires 'provsql' binary to be installed in the Postgres container/host.
-- If failing here, ensure the Dockerfile includes provsql installation.
CREATE EXTENSION IF NOT EXISTS "provsql";

-- 2. Verify Target Table Exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analysis_results') THEN
        RAISE NOTICE 'Table analysis_results does not exist, skipping provenance setup.';
    ELSE
        -- 3. Add Provenance
        -- This alters the table to add a 'provsql' column (hidden) that tracks the provenance token.
        -- It does NOT change application logic or visible schema for standard SELECTs.
        PERFORM add_provenance('analysis_results');
        
        RAISE NOTICE 'Provenance tracking enabled for analysis_results.';
    END IF;
END
$$;

COMMIT;

-- ROLLBACK STEPS (Manual)
-- 1. SELECT remove_provenance('analysis_results');
-- 2. DROP EXTENSION "provsql";
