BEGIN;

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.rls_enabled() RETURNS BOOLEAN AS $$
  SELECT COALESCE(NULLIF(current_setting('app.rls_v1', true), ''), '0') = '1';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.current_tenant_id() RETURNS VARCHAR AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.current_case_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_case_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.allow_case_row(case_identifier UUID) RETURNS BOOLEAN AS $$
  SELECT NOT app.rls_enabled()
    OR EXISTS (
      SELECT 1
      FROM maestro.cases c
      WHERE c.id = case_identifier
        AND c.tenant_id = app.current_tenant_id()
        AND (app.current_case_id() IS NULL OR c.id = app.current_case_id())
    );
$$ LANGUAGE sql STABLE;

CREATE INDEX IF NOT EXISTS idx_cases_tenant_case ON maestro.cases(tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_audit_access_logs_tenant_case ON maestro.audit_access_logs(tenant_id, case_id);

ALTER TABLE maestro.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_cases_tenant_guard ON maestro.cases
  USING (
    NOT app.rls_enabled()
    OR tenant_id = app.current_tenant_id()
  );

ALTER TABLE maestro.audit_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_audit_access_logs_guard ON maestro.audit_access_logs
  USING (
    NOT app.rls_enabled()
    OR (
      tenant_id = app.current_tenant_id()
      AND (
        case_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM maestro.cases c
          WHERE c.id = audit_access_logs.case_id
            AND c.tenant_id = app.current_tenant_id()
        )
      )
    )
  );

ALTER TABLE maestro.case_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_case_participants_guard ON maestro.case_participants
  USING (app.allow_case_row(case_id));

ALTER TABLE maestro.case_state_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_case_state_history_guard ON maestro.case_state_history
  USING (app.allow_case_row(case_id));

ALTER TABLE maestro.case_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_case_tasks_guard ON maestro.case_tasks
  USING (app.allow_case_row(case_id));

ALTER TABLE maestro.case_slas ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_case_slas_guard ON maestro.case_slas
  USING (app.allow_case_row(case_id));

ALTER TABLE maestro.case_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_case_approvals_guard ON maestro.case_approvals
  USING (app.allow_case_row(case_id));

ALTER TABLE maestro.case_approval_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_case_approval_votes_guard ON maestro.case_approval_votes
  USING (
    NOT app.rls_enabled()
    OR EXISTS (
      SELECT 1
      FROM maestro.case_approvals ca
      JOIN maestro.cases c ON c.id = ca.case_id
      WHERE ca.id = case_approval_votes.approval_id
        AND c.tenant_id = app.current_tenant_id()
        AND (app.current_case_id() IS NULL OR c.id = app.current_case_id())
    )
  );

ALTER TABLE maestro.case_graph_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_case_graph_references_guard ON maestro.case_graph_references
  USING (app.allow_case_row(case_id));

COMMIT;
