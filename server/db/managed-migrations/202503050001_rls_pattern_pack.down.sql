BEGIN;

DROP POLICY IF EXISTS rls_case_graph_references_guard ON maestro.case_graph_references;
ALTER TABLE maestro.case_graph_references DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_case_approval_votes_guard ON maestro.case_approval_votes;
ALTER TABLE maestro.case_approval_votes DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_case_approvals_guard ON maestro.case_approvals;
ALTER TABLE maestro.case_approvals DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_case_slas_guard ON maestro.case_slas;
ALTER TABLE maestro.case_slas DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_case_tasks_guard ON maestro.case_tasks;
ALTER TABLE maestro.case_tasks DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_case_state_history_guard ON maestro.case_state_history;
ALTER TABLE maestro.case_state_history DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_case_participants_guard ON maestro.case_participants;
ALTER TABLE maestro.case_participants DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_audit_access_logs_guard ON maestro.audit_access_logs;
ALTER TABLE maestro.audit_access_logs DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_cases_tenant_guard ON maestro.cases;
ALTER TABLE maestro.cases DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS idx_audit_access_logs_tenant_case;
DROP INDEX IF EXISTS idx_cases_tenant_case;

DROP FUNCTION IF EXISTS app.allow_case_row(UUID);
DROP FUNCTION IF EXISTS app.current_case_id();
DROP FUNCTION IF EXISTS app.current_tenant_id();
DROP FUNCTION IF EXISTS app.rls_enabled();

COMMIT;
