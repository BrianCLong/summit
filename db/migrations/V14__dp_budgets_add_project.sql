ALTER TABLE dp_budgets ADD COLUMN IF NOT EXISTS project text;
CREATE INDEX IF NOT EXISTS idx_dp_budgets_tenant_project ON dp_budgets(tenant, project);
