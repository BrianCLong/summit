ALTER TABLE metrics.facts_cdc ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics.facts_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY facts_cdc_tenant_isolation
  ON metrics.facts_cdc
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY facts_graph_tenant_isolation
  ON metrics.facts_graph
  USING (tenant_id = current_setting('app.tenant_id', true));
