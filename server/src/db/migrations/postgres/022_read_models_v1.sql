-- Read Models v1 - Case dashboard projection
-- Introduces read-optimized table and triggers to reduce join fanout for case dashboards

CREATE TABLE IF NOT EXISTS maestro.case_dashboard_read_models (
    case_id UUID PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL,
    participant_count INTEGER NOT NULL DEFAULT 0,
    open_task_count INTEGER NOT NULL DEFAULT 0,
    breached_sla_count INTEGER NOT NULL DEFAULT 0,
    at_risk_sla_count INTEGER NOT NULL DEFAULT 0,
    pending_approval_count INTEGER NOT NULL DEFAULT 0,
    last_task_due_at TIMESTAMPTZ,
    refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE maestro.case_dashboard_read_models IS 'Read model for case dashboard metrics (v1)';

-- Projection function used by triggers and backfills
CREATE OR REPLACE FUNCTION maestro.refresh_case_dashboard_read_model(p_case_id UUID)
RETURNS VOID AS $$
DECLARE
    v_case RECORD;
BEGIN
    SELECT id, tenant_id, title, status
    INTO v_case
    FROM maestro.cases
    WHERE id = p_case_id;

    IF NOT FOUND THEN
        DELETE FROM maestro.case_dashboard_read_models WHERE case_id = p_case_id;
        RETURN;
    END IF;

    INSERT INTO maestro.case_dashboard_read_models (
        case_id,
        tenant_id,
        title,
        status,
        participant_count,
        open_task_count,
        breached_sla_count,
        at_risk_sla_count,
        pending_approval_count,
        last_task_due_at,
        refreshed_at
    )
    SELECT
        v_case.id,
        v_case.tenant_id,
        v_case.title,
        v_case.status,
        COALESCE((
            SELECT COUNT(*)
            FROM maestro.case_participants cp
            WHERE cp.case_id = v_case.id
              AND cp.is_active = true
        ), 0) AS participant_count,
        COALESCE((
            SELECT COUNT(*)
            FROM maestro.case_tasks ct
            WHERE ct.case_id = v_case.id
              AND ct.status NOT IN ('completed', 'cancelled')
        ), 0) AS open_task_count,
        COALESCE((
            SELECT COUNT(*)
            FROM maestro.case_slas cs
            WHERE cs.case_id = v_case.id
              AND cs.status = 'breached'
        ), 0) AS breached_sla_count,
        COALESCE((
            SELECT COUNT(*)
            FROM maestro.case_slas cs
            WHERE cs.case_id = v_case.id
              AND cs.status = 'at_risk'
        ), 0) AS at_risk_sla_count,
        COALESCE((
            SELECT COUNT(*)
            FROM maestro.case_approvals ca
            WHERE ca.case_id = v_case.id
              AND ca.status = 'pending'
        ), 0) AS pending_approval_count,
        (
            SELECT MAX(ct.due_date)
            FROM maestro.case_tasks ct
            WHERE ct.case_id = v_case.id
              AND ct.due_date IS NOT NULL
        ) AS last_task_due_at,
        NOW() AS refreshed_at
    ON CONFLICT (case_id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        participant_count = EXCLUDED.participant_count,
        open_task_count = EXCLUDED.open_task_count,
        breached_sla_count = EXCLUDED.breached_sla_count,
        at_risk_sla_count = EXCLUDED.at_risk_sla_count,
        pending_approval_count = EXCLUDED.pending_approval_count,
        last_task_due_at = EXCLUDED.last_task_due_at,
        refreshed_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger helper to update the projection for the affected case
CREATE OR REPLACE FUNCTION maestro.touch_case_dashboard_read_model()
RETURNS TRIGGER AS $$
DECLARE
    target_case_id UUID;
BEGIN
    target_case_id := COALESCE(NEW.case_id, OLD.case_id);

    IF target_case_id IS NOT NULL THEN
        PERFORM maestro.refresh_case_dashboard_read_model(target_case_id);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Backfill helper for jobs/CLI
CREATE OR REPLACE FUNCTION maestro.backfill_case_dashboard_read_models()
RETURNS INTEGER AS $$
DECLARE
    processed INTEGER := 0;
BEGIN
    FOR target IN SELECT id FROM maestro.cases LOOP
        PERFORM maestro.refresh_case_dashboard_read_model(target.id);
        processed := processed + 1;
    END LOOP;

    RETURN processed;
END;
$$ LANGUAGE plpgsql;

-- Triggers on case lifecycle tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'tr_case_dashboard_refresh_on_cases'
    ) THEN
        CREATE TRIGGER tr_case_dashboard_refresh_on_cases
        AFTER INSERT OR UPDATE OR DELETE ON maestro.cases
        FOR EACH ROW EXECUTE FUNCTION maestro.touch_case_dashboard_read_model();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'tr_case_dashboard_refresh_on_participants'
    ) THEN
        CREATE TRIGGER tr_case_dashboard_refresh_on_participants
        AFTER INSERT OR UPDATE OR DELETE ON maestro.case_participants
        FOR EACH ROW EXECUTE FUNCTION maestro.touch_case_dashboard_read_model();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'tr_case_dashboard_refresh_on_tasks'
    ) THEN
        CREATE TRIGGER tr_case_dashboard_refresh_on_tasks
        AFTER INSERT OR UPDATE OR DELETE ON maestro.case_tasks
        FOR EACH ROW EXECUTE FUNCTION maestro.touch_case_dashboard_read_model();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'tr_case_dashboard_refresh_on_slas'
    ) THEN
        CREATE TRIGGER tr_case_dashboard_refresh_on_slas
        AFTER INSERT OR UPDATE OR DELETE ON maestro.case_slas
        FOR EACH ROW EXECUTE FUNCTION maestro.touch_case_dashboard_read_model();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'tr_case_dashboard_refresh_on_approvals'
    ) THEN
        CREATE TRIGGER tr_case_dashboard_refresh_on_approvals
        AFTER INSERT OR UPDATE OR DELETE ON maestro.case_approvals
        FOR EACH ROW EXECUTE FUNCTION maestro.touch_case_dashboard_read_model();
    END IF;
END;
$$;

COMMENT ON FUNCTION maestro.refresh_case_dashboard_read_model IS 'Recompute case dashboard read model row (READ_MODELS_V1)';
COMMENT ON FUNCTION maestro.backfill_case_dashboard_read_models IS 'Backfill helper for case dashboard read models (READ_MODELS_V1)';
