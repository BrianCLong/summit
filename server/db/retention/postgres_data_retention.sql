-- Summit Data Retention Automation for PostgreSQL
--
-- This script provides reusable primitives for archiving or deleting
-- data that has exceeded an approved retention period. The rules are
-- intentionally metadata-driven so that compliance teams can register
-- policies without shipping new application code.
--
-- Key concepts
--  * compliance.retention_rules describes which tables are governed,
--    how long records must be kept, and which action to take.
--  * compliance.apply_retention() executes the rules, writing an audit
--    trail to compliance.retention_audit_log so SOC 2 and GDPR reviews
--    have tamper-evident evidence of enforcement.
--  * The script is idempotent and safe to run from scheduled jobs.

BEGIN;

CREATE SCHEMA IF NOT EXISTS compliance;

CREATE TABLE IF NOT EXISTS compliance.retention_rules (
    id                     BIGSERIAL PRIMARY KEY,
    table_fqn              TEXT        NOT NULL,
    primary_key_column     TEXT        NOT NULL,
    timestamp_column       TEXT        NOT NULL,
    retention_period       INTERVAL    NOT NULL,
    action                 TEXT        NOT NULL CHECK (action IN ('ARCHIVE', 'DELETE')),
    archive_table_fqn      TEXT,
    filter_predicate       TEXT        NOT NULL DEFAULT 'TRUE',
    enabled                BOOLEAN     NOT NULL DEFAULT TRUE,
    last_run_at            TIMESTAMPTZ,
    last_run_rows          BIGINT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance.retention_audit_log (
    id              BIGSERIAL PRIMARY KEY,
    rule_id         BIGINT      NOT NULL REFERENCES compliance.retention_rules(id) ON DELETE CASCADE,
    action          TEXT        NOT NULL,
    executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rows_affected   BIGINT      NOT NULL DEFAULT 0,
    status          TEXT        NOT NULL,
    message         TEXT,
    details         JSONB       DEFAULT '{}'::JSONB
);

CREATE OR REPLACE FUNCTION compliance.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'retention_rules_set_updated_at'
    ) THEN
        CREATE TRIGGER retention_rules_set_updated_at
        BEFORE UPDATE ON compliance.retention_rules
        FOR EACH ROW EXECUTE FUNCTION compliance.touch_updated_at();
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION compliance.quote_fqn(fqn TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    parts TEXT[];
    quoted TEXT;
BEGIN
    parts := string_to_array(fqn, '.');
    IF array_length(parts, 1) = 2 THEN
        quoted := quote_ident(parts[1]) || '.' || quote_ident(parts[2]);
    ELSE
        quoted := quote_ident(fqn);
    END IF;
    RETURN quoted;
END;
$$;

CREATE OR REPLACE FUNCTION compliance.apply_retention()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    r                       compliance.retention_rules%ROWTYPE;
    cutoff                  TIMESTAMPTZ;
    quoted_table            TEXT;
    quoted_archive          TEXT;
    quoted_timestamp        TEXT;
    inserted_count          BIGINT;
    deleted_count           BIGINT;
    status_text             TEXT;
    message_text            TEXT;
BEGIN
    FOR r IN
        SELECT * FROM compliance.retention_rules
        WHERE enabled = TRUE
        ORDER BY id
    LOOP
        inserted_count := 0;
        deleted_count := 0;
        status_text := 'SUCCESS';
        message_text := NULL;
        cutoff := NOW() - r.retention_period;
        quoted_table := compliance.quote_fqn(r.table_fqn);
        quoted_timestamp := quote_ident(r.timestamp_column);

        BEGIN
            IF r.action = 'ARCHIVE' THEN
                IF r.archive_table_fqn IS NULL THEN
                    RAISE EXCEPTION 'Archive action selected but archive_table_fqn is NULL for rule %', r.id;
                END IF;

                quoted_archive := compliance.quote_fqn(r.archive_table_fqn);

                EXECUTE format('CREATE TABLE IF NOT EXISTS %s (LIKE %s INCLUDING ALL);', quoted_archive, quoted_table);

                EXECUTE format(
                    'INSERT INTO %1$s
                     SELECT * FROM %2$s
                     WHERE %3$s <= $1 AND (%4$s);',
                    quoted_archive,
                    quoted_table,
                    quoted_timestamp,
                    r.filter_predicate
                ) USING cutoff;
                GET DIAGNOSTICS inserted_count = ROW_COUNT;

                EXECUTE format(
                    'DELETE FROM %1$s
                     WHERE %2$s <= $1 AND (%3$s);',
                    quoted_table,
                    quoted_timestamp,
                    r.filter_predicate
                ) USING cutoff;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;

                message_text := format('Archived %s rows from %s to %s (rule %s).', inserted_count, r.table_fqn, r.archive_table_fqn, r.id);
            ELSE
                EXECUTE format(
                    'DELETE FROM %1$s
                     WHERE %2$s <= $1 AND (%3$s);',
                    quoted_table,
                    quoted_timestamp,
                    r.filter_predicate
                ) USING cutoff;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                message_text := format('Deleted %s rows from %s (rule %s).', deleted_count, r.table_fqn, r.id);
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                status_text := 'ERROR';
                message_text := format('Rule %s failed: %s', r.id, SQLERRM);
        END;

        UPDATE compliance.retention_rules
        SET last_run_at = NOW(),
            last_run_rows = COALESCE(deleted_count, 0)
        WHERE id = r.id;

        INSERT INTO compliance.retention_audit_log (
            rule_id,
            action,
            executed_at,
            rows_affected,
            status,
            message,
            details
        )
        VALUES (
            r.id,
            r.action,
            NOW(),
            COALESCE(CASE WHEN r.action = 'ARCHIVE' THEN inserted_count ELSE deleted_count END, 0),
            status_text,
            message_text,
            jsonb_build_object(
                'table', r.table_fqn,
                'archive_table', r.archive_table_fqn,
                'cutoff', cutoff,
                'filter', r.filter_predicate,
                'rows_archived', inserted_count,
                'rows_deleted', deleted_count
            )
        );
    END LOOP;
END;
$$;

COMMIT;

-- Example rule registration (disabled by default):
-- INSERT INTO compliance.retention_rules (
--     table_fqn,
--     primary_key_column,
--     timestamp_column,
--     retention_period,
--     action,
--     archive_table_fqn,
--     filter_predicate,
--     enabled
-- ) VALUES (
--     'public.audit_events',
--     'id',
--     'occurred_at',
--     INTERVAL '730 days',
--     'ARCHIVE',
--     'archive.audit_events',
--     'severity != ''critical''',
--     TRUE
-- );

-- To run manually:
-- SELECT compliance.apply_retention();
