BEGIN;

-- Check if we performed the swap
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'outbox_events_old') THEN
        -- Drop the partitioned table (which is now named outbox_events)
        DROP TABLE IF EXISTS outbox_events CASCADE;

        -- Restore the old table
        ALTER TABLE outbox_events_old RENAME TO outbox_events;
    ELSE
        -- If we just created the partitioned table without swapping (fresh install case perhaps, though migration logic handles it),
        -- or if we want to reverse a fresh create, we just drop the partitioned table.
        -- But if outbox_events IS the partitioned table, we should drop it.

        -- Check if current outbox_events is partitioned
        IF EXISTS (SELECT FROM pg_class c JOIN pg_partitioned_table p ON p.partrelid = c.oid WHERE c.relname = 'outbox_events') THEN
             DROP TABLE outbox_events CASCADE;
        END IF;
    END IF;
END $$;

COMMIT;
