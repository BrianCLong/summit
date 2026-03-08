-- Performance Optimization for Sprint 08
-- Adds indexes to speed up receipt search and approvals inbox

-- 1. Maestro Runs - Faster lookup by tenant
CREATE INDEX IF NOT EXISTS idx_maestro_runs_tenant_id_created ON maestro_runs(tenant_id, created_at DESC);

-- 2. Maestro Tasks - Faster lookup by run and tenant
CREATE INDEX IF NOT EXISTS idx_maestro_tasks_run_tenant ON maestro_tasks(run_id, tenant_id);

-- 3. Orchestrator Runs (Hardened Schema)
CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_tenant_status ON orchestrator_runs(tenant_id, status);

-- 4. Orchestrator Tasks (Hardened Schema)
CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_run_tenant ON orchestrator_tasks(run_id, tenant_id);

-- 5. Provenance Ledger V2 - Faster lookup for export
CREATE INDEX IF NOT EXISTS idx_provenance_ledger_v2_tenant_resource ON provenance_ledger_v2(tenant_id, resource_id);

-- 6. Usage Events - Faster FinOps queries
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_kind_occurred ON usage_events(tenant_id, kind, occurred_at);
